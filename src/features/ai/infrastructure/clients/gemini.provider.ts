import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  ThinkingLevel,
  type FunctionCall,
  type FunctionDeclaration,
  type GenerateVideosOperation,
} from "@google/genai";
import { detectSupportedImage, matchesFileSignature } from "@/core/utils";
import { AssetKind } from "@/features/assets/domain";
import {
  AiProviderId,
  ChatResultType,
  IMAGE_GENERATION_ASPECT_RATIOS,
  IMAGE_GENERATION_RESOLUTIONS,
  VIDEO_GENERATION_ASPECT_RATIOS,
  VIDEO_GENERATION_RESOLUTIONS,
  type ChatInput,
  type ChatResult,
} from "../../domain";
import type {
  AiProviderIdentity,
  GeneratedMedia,
  GenerateProviderMediaInput,
  GenerateTextInput,
  ImageGenerator,
  TextGenerator,
  VideoGenerator,
} from "@/services/ai";
import {
  type ChatClient,
  type ChatTextDeltaHandler,
  ChatUnavailableError,
} from "./chat.client";
import { toGeminiMediaGenerationError } from "./gemini-media-generation-error";

interface GeminiProviderConfig {
  apiKey: string;
  textModel: string;
  requestTimeoutMs: number;
  generationTimeoutMs: number;
  videoPollIntervalMs: number;
}

const GENERATE_IMAGE_TOOL = "generate_image";
const GENERATE_VIDEO_TOOL = "generate_video";
const IMAGE_GENERATION_CONCURRENCY = 2;
const VIDEO_POLL_MAX_INTERVAL_MS = 10_000;
const VIDEO_POLL_MULTIPLIER = 1.5;
const VIDEO_POLL_JITTER_RATIO = 0.1;

const MEDIA_GENERATION_TOOLS: FunctionDeclaration[] = [
  {
    name: GENERATE_IMAGE_TOOL,
    description:
      "Start image generation only when the user clearly asks to create or generate an image.",
    parametersJsonSchema: { type: "object", additionalProperties: false },
  },
  {
    name: GENERATE_VIDEO_TOOL,
    description:
      "Start video generation only when the user clearly asks to create or generate a video.",
    parametersJsonSchema: { type: "object", additionalProperties: false },
  },
];

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

function supportsOptionalValue(values: readonly string[], value: string | null): boolean {
  return value === null || values.includes(value);
}

function decodeRequiredBase64(value: string | undefined): Uint8Array {
  if (!value) {
    throw new Error("Gemini returned an image without media bytes");
  }

  const bytes = Buffer.from(value, "base64");
  if (bytes.length === 0) {
    throw new Error("Gemini returned an image with empty media bytes");
  }
  return bytes;
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

function calculateVideoPollDelay(initialIntervalMs: number, attempt: number): number {
  const maximum = Math.max(initialIntervalMs, VIDEO_POLL_MAX_INTERVAL_MS);
  const base = Math.min(maximum, initialIntervalMs * VIDEO_POLL_MULTIPLIER ** attempt);
  const jitter = base * VIDEO_POLL_JITTER_RATIO * (Math.random() * 2 - 1);
  return Math.max(1, Math.min(maximum, Math.round(base + jitter)));
}

export class GeminiProvider
  implements AiProviderIdentity, ChatClient, TextGenerator, ImageGenerator, VideoGenerator
{
  readonly id = AiProviderId.GEMINI;
  private readonly sdkClient: GoogleGenAI;

  constructor(private readonly config: GeminiProviderConfig) {
    this.sdkClient = new GoogleGenAI({
      apiKey: config.apiKey,
      httpOptions: {
        timeout: config.requestTimeoutMs,
        retryOptions: { attempts: 1 },
      },
    });
  }

  async respond(
    input: ChatInput,
    onTextDelta?: ChatTextDeltaHandler,
  ): Promise<ChatResult> {
    try {
      const hint = input.intentHint
        ? `The UI currently suggests ${input.intentHint}, but this is only a preference and never sufficient by itself to call a tool.`
        : "The UI has no media preference.";
      const response = await this.sdkClient.models.generateContentStream({
        model: this.config.textModel,
        contents: input.content,
        config: {
          systemInstruction: [
            "You are the conversational assistant for Reelingo.",
            "Reply with natural-language text for ordinary chat, questions, capability discussions, and requests that do not clearly ask to create media.",
            "Call generate_image only for a clear image-creation request and generate_video only for a clear video-creation request.",
            "If the user wants media but the requested media type is ambiguous, ask a concise clarifying question in text instead of calling a tool.",
            "Return at most one tool call. Do not claim that media has completed before the generation worker finishes.",
            hint,
          ].join(" "),
          tools: [{ functionDeclarations: MEDIA_GENERATION_TOOLS }],
          toolConfig: {
            functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
          },
        },
      });

      const textParts: string[] = [];
      const functionCalls: FunctionCall[] = [];
      let textDeltaHandler = onTextDelta;
      for await (const chunk of response) {
        const chunkFunctionCalls = chunk.functionCalls ?? [];
        if (chunkFunctionCalls.length > 0) {
          functionCalls.push(...chunkFunctionCalls);
          continue;
        }

        const text = chunk.text;
        if (!text) continue;

        textParts.push(text);
        if (textDeltaHandler) {
          try {
            await textDeltaHandler(text);
          } catch {
            textDeltaHandler = undefined;
          }
        }
      }

      if (functionCalls.length > 1) {
        throw new Error("Gemini returned more than one media generation call");
      }

      const functionName = functionCalls.at(0)?.name;
      if (functionName === GENERATE_IMAGE_TOOL) {
        return { type: ChatResultType.GENERATION, mediaType: AssetKind.IMAGE };
      }
      if (functionName === GENERATE_VIDEO_TOOL) {
        return { type: ChatResultType.GENERATION, mediaType: AssetKind.VIDEO };
      }
      if (functionName) {
        throw new Error(`Gemini returned an unsupported function: ${functionName}`);
      }

      const text = textParts.join("").trim();
      if (!text) {
        throw new Error("Gemini returned an empty chat response");
      }

      return { type: ChatResultType.REPLY, content: text };
    } catch (error) {
      throw new ChatUnavailableError("Gemini chat routing is unavailable", {
        cause: error,
      });
    }
  }

  async generateText({
    prompt,
    type,
    outputCount,
    signal,
  }: GenerateTextInput): Promise<string> {
    try {
      const response = await this.sdkClient.models.generateContent({
        model: this.config.textModel,
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
    } catch (error) {
      throw new Error("Gemini generation completion text is unavailable", {
        cause: error,
      });
    }
  }

  async generateImage(
    input: GenerateProviderMediaInput,
  ): Promise<GeneratedMedia[]> {
    return this.runMediaGeneration(
      input.signal,
      "Gemini image generation is unavailable",
      async (signal) => {
        if (
          !supportsOptionalValue(
            IMAGE_GENERATION_ASPECT_RATIOS,
            input.config.aspectRatio,
          ) ||
          !supportsOptionalValue(IMAGE_GENERATION_RESOLUTIONS, input.config.resolution)
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
            Array.from({ length: batchSize }, () =>
              this.generateSingleImage(input, signal),
            ),
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
      },
    );
  }

  async generateVideo(
    input: GenerateProviderMediaInput,
  ): Promise<GeneratedMedia> {
    return this.runMediaGeneration(
      input.signal,
      "Gemini video generation is unavailable",
      async (signal) => {
        if (
          input.config.outputCount !== 1 ||
          !supportsOptionalValue(
            VIDEO_GENERATION_ASPECT_RATIOS,
            input.config.aspectRatio,
          ) ||
          !supportsOptionalValue(VIDEO_GENERATION_RESOLUTIONS, input.config.resolution)
        ) {
          throw new Error("Video generation config is not supported by Veo");
        }

        let operation = await this.sdkClient.models.generateVideos({
          model: input.model,
          source: { prompt: input.prompt },
          config: {
            abortSignal: signal,
            numberOfVideos: 1,
            ...(input.config.aspectRatio
              ? { aspectRatio: input.config.aspectRatio }
              : {}),
            ...(input.config.resolution ? { resolution: input.config.resolution } : {}),
            enhancePrompt: input.config.enhancePrompt,
          },
        });

        let pollAttempt = 0;
        while (!operation.done) {
          await delay(
            calculateVideoPollDelay(this.config.videoPollIntervalMs, pollAttempt),
            undefined,
            { signal },
          );
          signal.throwIfAborted();
          operation = await this.sdkClient.operations.getVideosOperation({ operation });
          pollAttempt += 1;
        }

        if (operation.error) {
          throw new Error("Gemini video generation operation failed");
        }

        return this.downloadVideo(operation, signal);
      },
    );
  }

  private async generateSingleImage(
    input: GenerateProviderMediaInput,
    signal: AbortSignal,
  ): Promise<GeneratedMedia> {
    const response = await this.sdkClient.models.generateContent({
      model: input.model,
      contents: input.prompt,
      config: {
        abortSignal: signal,
        responseModalities: ["IMAGE"],
        ...(input.model.startsWith("gemini-3.1-")
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
    const bytes = decodeRequiredBase64(image?.data);
    const mimeType = image?.mimeType ?? "image/png";
    validateGeneratedImage(bytes, mimeType);
    return { bytes, mimeType };
  }

  private async downloadVideo(
    operation: GenerateVideosOperation,
    signal: AbortSignal,
  ): Promise<GeneratedMedia> {
    const generated = operation.response?.generatedVideos?.at(0);
    if (!generated?.video) {
      throw new Error("Gemini returned no generated video");
    }

    const directory = await mkdtemp(path.join(tmpdir(), "reelingo-video-"));
    try {
      const downloadPath = path.join(directory, "0.mp4");
      await this.sdkClient.files.download({
        file: generated.video,
        downloadPath,
        config: { abortSignal: signal },
      });
      const bytes = await readFile(downloadPath);
      const mimeType = generated.video.mimeType ?? "video/mp4";
      validateGeneratedVideo(bytes, mimeType);
      return { bytes, mimeType };
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  private async runMediaGeneration<T>(
    signal: AbortSignal,
    unavailableMessage: string,
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const boundedSignal = AbortSignal.any([
      signal,
      AbortSignal.timeout(this.config.generationTimeoutMs),
    ]);

    try {
      return await operation(boundedSignal);
    } catch (error) {
      throw toGeminiMediaGenerationError(unavailableMessage, error);
    }
  }
}
