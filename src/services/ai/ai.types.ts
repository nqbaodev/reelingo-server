export type AiProviderId = string;
export type AiMediaType = "image" | "video";

export interface AiModelRoute {
  readonly providerId: AiProviderId;
  readonly model: string;
}

export interface AiGenerationOptions {
  aspectRatio: string | null;
  resolution: string | null;
  outputCount: number;
  enhancePrompt: boolean;
}

export interface GenerateTextInput {
  prompt: string;
  type: AiMediaType;
  outputCount: number;
  signal: AbortSignal;
}

export interface TextGenerator {
  generateText(input: GenerateTextInput): Promise<string>;
}

export interface GenerateMediaInput {
  generationId: string;
  prompt: string;
  type: AiMediaType;
  config: AiGenerationOptions;
  route: AiModelRoute;
  signal: AbortSignal;
}

export interface GenerateProviderMediaInput {
  generationId: string;
  prompt: string;
  config: AiGenerationOptions;
  model: string;
  signal: AbortSignal;
}

export interface GeneratedMedia {
  bytes: Uint8Array;
  mimeType: string;
}

export interface MediaGenerator {
  generate(input: GenerateMediaInput): Promise<GeneratedMedia[]>;
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
