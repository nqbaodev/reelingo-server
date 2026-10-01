import type { AiProviderId } from "../../domain";
import type { GenerateTextInput, TextGenerator } from "./text-generator";
import type { GeneratedMedia, GenerateProviderMediaInput } from "./media-generator";

export const AiCapability = {
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
} as const;

export type AiCapability = (typeof AiCapability)[keyof typeof AiCapability];

export class UnsupportedAiCapabilityError extends Error {
  constructor(
    readonly providerId: AiProviderId,
    readonly capability: AiCapability,
    providerDisplayName: string,
  ) {
    super(`${providerDisplayName} does not support ${capability} generation`);
    this.name = new.target.name;
  }
}

export interface AiProvider extends TextGenerator {
  readonly id: AiProviderId;
  generateImage(input: GenerateProviderMediaInput): Promise<GeneratedMedia[]>;
  generateVideo(input: GenerateProviderMediaInput): Promise<GeneratedMedia>;
}

export type AiProviderRegistry = ReadonlyMap<AiProviderId, AiProvider>;

export abstract class BaseAiProvider implements AiProvider {
  constructor(
    readonly id: AiProviderId,
    private readonly displayName: string,
  ) {}

  generateText(_input: GenerateTextInput): Promise<string> {
    return Promise.reject(this.unsupported(AiCapability.TEXT));
  }

  generateImage(_input: GenerateProviderMediaInput): Promise<GeneratedMedia[]> {
    return Promise.reject(this.unsupported(AiCapability.IMAGE));
  }

  generateVideo(_input: GenerateProviderMediaInput): Promise<GeneratedMedia> {
    return Promise.reject(this.unsupported(AiCapability.VIDEO));
  }

  private unsupported(capability: AiCapability): UnsupportedAiCapabilityError {
    return new UnsupportedAiCapabilityError(this.id, capability, this.displayName);
  }
}
