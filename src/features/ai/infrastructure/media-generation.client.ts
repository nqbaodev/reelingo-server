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

export const MediaGenerationFailureType = {
  RETRYABLE: "retryable",
  BLOCKED: "blocked",
  INVALID: "invalid",
  UNKNOWN: "unknown",
} as const;

export type MediaGenerationFailureType =
  (typeof MediaGenerationFailureType)[keyof typeof MediaGenerationFailureType];

interface MediaGenerationErrorOptions extends ErrorOptions {
  failureType?: MediaGenerationFailureType;
  providerCode?: string | null;
}

export class MediaGenerationUnavailableError extends Error {
  readonly failureType: MediaGenerationFailureType;
  readonly providerCode: string | null;

  constructor(message: string, options: MediaGenerationErrorOptions = {}) {
    super(message, options);
    this.name = new.target.name;
    this.failureType = options.failureType ?? MediaGenerationFailureType.UNKNOWN;
    this.providerCode = options.providerCode ?? null;
  }
}
