import type {
  AiProviderId,
  ImageProvider,
  TextProvider,
  VideoProvider,
} from "@/application/interfaces/ai/ai.types";

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
