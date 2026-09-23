import type { AiGenerationConfig } from "../domain";
import type { MediaType } from "@/features/media/domain";

export interface GenerateMediaInput {
  generationId: string;
  prompt: string;
  type: MediaType;
  config: AiGenerationConfig;
  signal: AbortSignal;
}

export interface GeneratedMedia {
  bytes: Uint8Array;
  mimeType: string;
}

export interface GenerateCompletionTextInput {
  prompt: string;
  type: MediaType;
  outputCount: number;
  signal: AbortSignal;
}

export interface MediaGenerationClient {
  generate(input: GenerateMediaInput): Promise<GeneratedMedia[]>;
  generateCompletionText(input: GenerateCompletionTextInput): Promise<string>;
}

export class MediaGenerationUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}
