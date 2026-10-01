import type {
  AiProviderId,
  GeneratedMedia,
  GenerateProviderMediaInput,
  TextGenerator,
} from "./ai.types";

export interface AiProviderIdentity {
  readonly id: AiProviderId;
}

export interface ImageGenerator {
  generateImage(input: GenerateProviderMediaInput): Promise<GeneratedMedia[]>;
}

export interface VideoGenerator {
  generateVideo(input: GenerateProviderMediaInput): Promise<GeneratedMedia>;
}

export type ImageProvider = AiProviderIdentity & ImageGenerator;
export type VideoProvider = AiProviderIdentity & VideoGenerator;
export type TextProvider = AiProviderIdentity & TextGenerator;

export class AiProviderRegistry {
  private readonly textProviders = new Map<AiProviderId, TextProvider>();
  private readonly imageProviders = new Map<AiProviderId, ImageProvider>();
  private readonly videoProviders = new Map<AiProviderId, VideoProvider>();

  registerText(provider: TextProvider): this {
    this.textProviders.set(provider.id, provider);
    return this;
  }

  registerImage(provider: ImageProvider): this {
    this.imageProviders.set(provider.id, provider);
    return this;
  }

  registerVideo(provider: VideoProvider): this {
    this.videoProviders.set(provider.id, provider);
    return this;
  }

  getText(providerId: AiProviderId): TextProvider | null {
    return this.textProviders.get(providerId) ?? null;
  }

  getImage(providerId: AiProviderId): ImageProvider | null {
    return this.imageProviders.get(providerId) ?? null;
  }

  getVideo(providerId: AiProviderId): VideoProvider | null {
    return this.videoProviders.get(providerId) ?? null;
  }
}
