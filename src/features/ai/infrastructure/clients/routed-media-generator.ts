import { AssetKind } from "@/features/assets/domain";
import type { AiModelRoute } from "../../domain";
import type { AiProvider, AiProviderRegistry } from "./base-ai-provider";
import type { GenerateMediaInput, MediaGenerator } from "./media-generator";

export class RoutedMediaGenerator implements MediaGenerator {
  constructor(private readonly providers: AiProviderRegistry) {}

  async generate(input: GenerateMediaInput) {
    const { route, type, ...providerInput } = input;
    const provider = this.requireProvider(route);

    switch (type) {
      case AssetKind.IMAGE:
        return provider.generateImage({ ...providerInput, model: route.model });
      case AssetKind.VIDEO:
        return [await provider.generateVideo({ ...providerInput, model: route.model })];
    }
  }

  private requireProvider(route: AiModelRoute): AiProvider {
    const provider = this.providers.get(route.providerId);
    if (!provider) {
      throw new Error(`No AI provider is configured for ${route.providerId}`);
    }
    return provider;
  }
}
