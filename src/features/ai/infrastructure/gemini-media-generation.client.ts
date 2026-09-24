import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { GoogleGenAI, ThinkingLevel, type GenerateVideosOperation } from "@google/genai";
import {
  detectSupportedImage,
  matchesFileSignature,
  MediaType,
} from "@/features/media/domain";
import {
  IMAGE_GENERATION_ASPECT_RATIOS,
  IMAGE_GENERATION_RESOLUTIONS,
  VIDEO_GENERATION_ASPECT_RATIOS,
  VIDEO_GENERATION_RESOLUTIONS,
} from "../domain";
import type {
  GenerateCompletionTextInput,
  GeneratedMedia,
  GenerateMediaInput,
  MediaGenerationClient,
} from "./media-generation.client";
import {
  MediaGenerationFailureType,
  MediaGenerationUnavailableError,
} from "./media-generation.client";

interface GeminiMediaGenerationClientConfig {
  apiKey: string;
  chatModel: string;
  imageModel: string;
  videoModel: string;
  requestTimeoutMs: number;
  generationTimeoutMs: number;
  videoPollIntervalMs: number;
}

const GENERATED_VIDEO_FORMATS = [
  {
    mimeType: "video/mp4",
    signatures: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],
  },
  {
    mimeType: "video/webm",
    signatures: [{ offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }],
  },
] as const;

const IMAGE_GENERATION_CONCURRENCY = 2;
const VIDEO_POLL_MAX_INTERVAL_MS = 10_000;
const VIDEO_POLL_MULTIPLIER = 1.5;
const VIDEO_POLL_JITTER_RATIO = 0.1;

const BLOCKED_PROVIDER_CODES = new Set([
  "blocklist",
  "content_blocked",
  "image_prohibited_content",
  "image_recitation",
  "image_safety",
  "prohibited_content",
  "recitation",
  "safety",
  "spii",
]);

const INVALID_PROVIDER_CODES = new Set([
  "failed_precondition",
  "invalid_argument",
  "invalid_request",
  "out_of_range",
  "parameter_unknown",
  "quota_exceeded",
]);

const RETRYABLE_PROVIDER_CODES = new Set([
  "api_error",
  "deadline_exceeded",
  "internal",
  "rate_limit_exceeded",
  "resource_exhausted",
  "service_unavailable",
  "too_many_requests",
  "unavailable",
]);

interface ProviderFailure {
  failureType: MediaGenerationFailureType;
  providerCode: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function providerErrorRecords(error: unknown): Record<string, unknown>[] {
  const outer = asRecord(error);
  const inner = asRecord(outer?.error);
  return [outer, inner].filter(
    (record): record is Record<string, unknown> => record !== null,
  );
}

function normalizeProviderCode(value: unknown): string | null {
  return typeof value === "string"
    ? value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_")
    : null;
}

function classifySingleProviderError(error: unknown): ProviderFailure {
  const records = providerErrorRecords(error);
  const providerCode =
    records
      .flatMap((record) => [record.code, record.status, record.reason])
      .map(normalizeProviderCode)
      .find((value): value is string => value !== null) ?? null;
  const statusCode = records
    .flatMap((record) => [record.statusCode, record.status, record.code])
    .find((value): value is number => typeof value === "number");

  if (providerCode && BLOCKED_PROVIDER_CODES.has(providerCode)) {
    return { failureType: MediaGenerationFailureType.BLOCKED, providerCode };
  }
  if (
    (providerCode && INVALID_PROVIDER_CODES.has(providerCode)) ||
    statusCode === 400 ||
    statusCode === 412 ||
    statusCode === 416 ||
    statusCode === 422
  ) {
    return { failureType: MediaGenerationFailureType.INVALID, providerCode };
  }
  if (
    (providerCode && RETRYABLE_PROVIDER_CODES.has(providerCode)) ||
    statusCode === 429 ||
    (statusCode !== undefined && statusCode >= 500)
  ) {
    return { failureType: MediaGenerationFailureType.RETRYABLE, providerCode };
  }

  return { failureType: MediaGenerationFailureType.UNKNOWN, providerCode };
}

function classifyProviderError(error: unknown): ProviderFailure {
  if (error instanceof MediaGenerationUnavailableError) {
    return { failureType: error.failureType, providerCode: error.providerCode };
  }
  if (error instanceof AggregateError) {
    const failures = error.errors.map(classifyProviderError);
    return (
      failures.find(
        (failure) => failure.failureType === MediaGenerationFailureType.BLOCKED,
      ) ??
      failures.find(
        (failure) => failure.failureType === MediaGenerationFailureType.INVALID,
      ) ??
      failures.find(
        (failure) => failure.failureType === MediaGenerationFailureType.RETRYABLE,
      ) ??
      failures[0] ?? {
        failureType: MediaGenerationFailureType.UNKNOWN,
        providerCode: null,
      }
    );
  }
  return classifySingleProviderError(error);
}

function toMediaGenerationError(message: string, cause: unknown): Error {
  if (cause instanceof MediaGenerationUnavailableError) {
    return cause;
  }
  const failure = classifyProviderError(cause);
  return new MediaGenerationUnavailableError(message, { cause, ...failure });
}

function videoPollDelayMs(initialIntervalMs: number, attempt: number): number {
  const maximum = Math.max(initialIntervalMs, VIDEO_POLL_MAX_INTERVAL_MS);
  const base = Math.min(maximum, initialIntervalMs * VIDEO_POLL_MULTIPLIER ** attempt);
  const jitter = base * VIDEO_POLL_JITTER_RATIO * (Math.random() * 2 - 1);
  return Math.max(1, Math.min(maximum, Math.round(base + jitter)));
}

function requiredBase64(value: string | undefined, label: string): Uint8Array {
  if (!value) {
    throw new Error(`Gemini returned ${label} without media bytes`);
  }

  const bytes = Buffer.from(value, "base64");
  if (bytes.length === 0) {
    throw new Error(`Gemini returned ${label} with empty media bytes`);
  }
  return bytes;
}

function includesValue(values: readonly string[], value: string | null): boolean {
  return value === null || values.includes(value);
}

function validateGeneratedImage(bytes: Uint8Array, mimeType: string): void {
  const detected = detectSupportedImage(bytes);
  if (!detected || detected.mimeType !== mimeType) {
    throw new Error("Gemini returned image bytes that do not match the MIME type");
  }
}

function validateGeneratedVideo(bytes: Uint8Array, mimeType: string): void {
  const format = GENERATED_VIDEO_FORMATS.find(
    (candidate) => candidate.mimeType === mimeType,
  );
  if (
    !format ||
    !format.signatures.every((signature) => matchesFileSignature(bytes, signature))
  ) {
    throw new Error("Gemini returned video bytes that do not match the MIME type");
  }
}

function combineWithTimeout(signal: AbortSignal, timeoutMs: number): AbortSignal {
  return AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
}

export class GeminiMediaGenerationClient implements MediaGenerationClient {
  private readonly client: GoogleGenAI;

  constructor(private readonly config: GeminiMediaGenerationClientConfig) {
    this.client = new GoogleGenAI({
      apiKey: config.apiKey,
      httpOptions: {
        timeout: config.requestTimeoutMs,
        retryOptions: { attempts: 1 },
      },
    });
  }

  async generate(input: GenerateMediaInput): Promise<GeneratedMedia[]> {
    const signal = combineWithTimeout(input.signal, this.config.generationTimeoutMs);

    try {
      return input.type === MediaType.IMAGE
        ? await this.generateImages(input, signal)
        : await this.generateVideos(input, signal);
    } catch (err) {
      throw toMediaGenerationError(`Gemini ${input.type} generation is unavailable`, err);
    }
  }

  async generateCompletionText({
    prompt,
    type,
    outputCount,
    signal,
  }: GenerateCompletionTextInput): Promise<string> {
    try {
      const response = await this.client.models.generateContent({
        model: this.config.chatModel,
        contents: prompt,
        config: {
          abortSignal: signal,
          systemInstruction: [
            "You are the conversational assistant for Reelingo.",
            `The requested ${type} generation has completed successfully with ${outputCount} output(s).`,
            "Reply with one concise natural-language message in the user's language.",
            "State that the media is ready. Do not say that it is queued or still processing.",
          ].join(" "),
        },
      });
      const text = response.text?.trim();
      if (!text) {
        throw new Error("Gemini returned an empty generation completion message");
      }

      return text;
    } catch (err) {
      throw toMediaGenerationError(
        "Gemini generation completion text is unavailable",
        err,
      );
    }
  }

  private async generateImages(
    input: GenerateMediaInput,
    signal: AbortSignal,
  ): Promise<GeneratedMedia[]> {
    if (
      !includesValue(IMAGE_GENERATION_ASPECT_RATIOS, input.config.aspectRatio) ||
      !includesValue(IMAGE_GENERATION_RESOLUTIONS, input.config.resolution)
    ) {
      throw new Error("Image generation config is not supported by Gemini");
    }

    const outputs: GeneratedMedia[] = [];
    const failures: unknown[] = [];
    for (
      let offset = 0;
      offset < input.config.outputCount;
      offset += IMAGE_GENERATION_CONCURRENCY
    ) {
      signal.throwIfAborted();
      const batchSize = Math.min(
        IMAGE_GENERATION_CONCURRENCY,
        input.config.outputCount - offset,
      );
      const results = await Promise.allSettled(
        Array.from({ length: batchSize }, () => this.generateImage(input, signal)),
      );
      for (const result of results) {
        if (result.status === "fulfilled") {
          outputs.push(result.value);
        } else {
          failures.push(result.reason);
        }
      }
    }

    if (outputs.length === 0) {
      throw new AggregateError(failures, "Gemini failed to generate every image");
    }
    return outputs;
  }

  private async generateImage(
    input: GenerateMediaInput,
    signal: AbortSignal,
  ): Promise<GeneratedMedia> {
    const response = await this.client.models.generateContent({
      model: this.config.imageModel,
      contents: input.prompt,
      config: {
        abortSignal: signal,
        responseModalities: ["IMAGE"],
        ...(this.config.imageModel.startsWith("gemini-3.1-")
          ? {
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.MINIMAL,
                includeThoughts: false,
              },
            }
          : {}),
        imageConfig: {
          ...(input.config.aspectRatio ? { aspectRatio: input.config.aspectRatio } : {}),
          ...(input.config.resolution ? { imageSize: input.config.resolution } : {}),
        },
      },
    });
    const parts = response.candidates?.flatMap(
      (candidate) => candidate.content?.parts ?? [],
    );
    const image = parts?.find(
      (part) => !part.thought && part.inlineData?.data,
    )?.inlineData;
    const bytes = requiredBase64(image?.data, "an image");
    const mimeType = image?.mimeType ?? "image/png";
    validateGeneratedImage(bytes, mimeType);
    return { bytes, mimeType };
  }

  private async generateVideos(
    input: GenerateMediaInput,
    signal: AbortSignal,
  ): Promise<GeneratedMedia[]> {
    if (
      input.config.outputCount !== 1 ||
      !includesValue(VIDEO_GENERATION_ASPECT_RATIOS, input.config.aspectRatio) ||
      !includesValue(VIDEO_GENERATION_RESOLUTIONS, input.config.resolution)
    ) {
      throw new Error("Video generation config is not supported by Veo");
    }

    let operation = await this.client.models.generateVideos({
      model: this.config.videoModel,
      source: { prompt: input.prompt },
      config: {
        abortSignal: signal,
        numberOfVideos: 1,
        ...(input.config.aspectRatio ? { aspectRatio: input.config.aspectRatio } : {}),
        ...(input.config.resolution ? { resolution: input.config.resolution } : {}),
        enhancePrompt: input.config.enhancePrompt,
      },
    });

    let pollAttempt = 0;
    while (!operation.done) {
      await delay(
        videoPollDelayMs(this.config.videoPollIntervalMs, pollAttempt),
        undefined,
        {
          signal,
        },
      );
      signal.throwIfAborted();
      operation = await this.client.operations.getVideosOperation({ operation });
      pollAttempt += 1;
    }

    if (operation.error) {
      throw new Error("Gemini video generation operation failed");
    }

    return this.downloadVideos(operation, signal);
  }

  private async downloadVideos(
    operation: GenerateVideosOperation,
    signal: AbortSignal,
  ): Promise<GeneratedMedia[]> {
    const videos = operation.response?.generatedVideos ?? [];
    if (videos.length === 0) {
      throw new Error("Gemini returned no generated videos");
    }

    const directory = await mkdtemp(path.join(tmpdir(), "reelingo-video-"));
    try {
      const outputs: GeneratedMedia[] = [];
      for (const [index, generated] of videos.entries()) {
        if (!generated.video) {
          throw new Error("Gemini returned a video result without a video");
        }

        const downloadPath = path.join(directory, `${index}.mp4`);
        await this.client.files.download({
          file: generated.video,
          downloadPath,
          config: { abortSignal: signal },
        });
        const bytes = await readFile(downloadPath);
        const mimeType = generated.video.mimeType ?? "video/mp4";
        validateGeneratedVideo(bytes, mimeType);
        outputs.push({ bytes, mimeType });
      }

      return outputs;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
