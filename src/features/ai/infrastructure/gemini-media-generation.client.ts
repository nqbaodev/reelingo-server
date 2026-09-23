import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { GoogleGenAI, type GenerateVideosOperation } from "@google/genai";
import { MediaType } from "@/features/media/domain";
import type {
  GenerateCompletionTextInput,
  GeneratedMedia,
  GenerateMediaInput,
  MediaGenerationClient,
} from "./media-generation.client";
import { MediaGenerationUnavailableError } from "./media-generation.client";

interface GeminiMediaGenerationClientConfig {
  apiKey: string;
  chatModel: string;
  imageModel: string;
  videoModel: string;
  requestTimeoutMs: number;
  generationTimeoutMs: number;
  videoPollIntervalMs: number;
}

function requiredBase64(value: string | undefined, label: string): Uint8Array {
  if (!value) {
    throw new Error(`Gemini returned ${label} without media bytes`);
  }

  return Buffer.from(value, "base64");
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
      throw new MediaGenerationUnavailableError(
        `Gemini ${input.type} generation is unavailable`,
        { cause: err },
      );
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
      throw new MediaGenerationUnavailableError(
        "Gemini generation completion text is unavailable",
        { cause: err },
      );
    }
  }

  private async generateImages(
    input: GenerateMediaInput,
    signal: AbortSignal,
  ): Promise<GeneratedMedia[]> {
    const outputs: GeneratedMedia[] = [];
    for (let index = 0; index < input.config.outputCount; index += 1) {
      const response = await this.client.models.generateContent({
        model: this.config.imageModel,
        contents: input.prompt,
        config: {
          abortSignal: signal,
          responseModalities: ["IMAGE"],
          imageConfig: {
            ...(input.config.aspectRatio
              ? { aspectRatio: input.config.aspectRatio }
              : {}),
            ...(input.config.resolution ? { imageSize: input.config.resolution } : {}),
          },
        },
      });
      const parts = response.candidates?.flatMap(
        (candidate) => candidate.content?.parts ?? [],
      );
      const image = parts?.find((part) => part.inlineData?.data)?.inlineData;
      outputs.push({
        bytes: requiredBase64(image?.data, "an image"),
        mimeType: image?.mimeType ?? "image/png",
      });
    }

    return outputs;
  }

  private async generateVideos(
    input: GenerateMediaInput,
    signal: AbortSignal,
  ): Promise<GeneratedMedia[]> {
    let operation = await this.client.models.generateVideos({
      model: this.config.videoModel,
      source: { prompt: input.prompt },
      config: {
        abortSignal: signal,
        numberOfVideos: input.config.outputCount,
        ...(input.config.aspectRatio ? { aspectRatio: input.config.aspectRatio } : {}),
        ...(input.config.resolution ? { resolution: input.config.resolution } : {}),
        enhancePrompt: input.config.enhancePrompt,
      },
    });

    while (!operation.done) {
      await delay(this.config.videoPollIntervalMs, undefined, { signal });
      operation = await this.client.operations.getVideosOperation({ operation });
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
        outputs.push({
          bytes: await readFile(downloadPath),
          mimeType: generated.video.mimeType ?? "video/mp4",
        });
      }

      return outputs;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
