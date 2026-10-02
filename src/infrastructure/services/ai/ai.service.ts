import type { AiProviderRegistry } from "./ai-provider.registry";
import type {
  AiProviderId,
  GenerateMediaInput,
  GenerateTextInput,
  MediaGenerator,
  TextGenerator,
} from "@/application/interfaces/ai/ai.types";

export class AiService implements MediaGenerator, TextGenerator {
  constructor(
    private readonly providers: AiProviderRegistry,
    private readonly textProviderId: AiProviderId,
  ) {}

  generateText(input: GenerateTextInput): Promise<string> {
    const provider = this.providers.getText(this.textProviderId);
    if (!provider) {
      throw new Error(`No text provider is configured for ${this.textProviderId}`);
    }
    return provider.generateText(input);
  }

  async generate(input: GenerateMediaInput) {
    const { route, type, ...providerInput } = input;
    switch (type) {
      case "image": {
        const provider = this.providers.getImage(route.providerId);
        if (!provider) {
          throw new Error(`No image provider is configured for ${route.providerId}`);
        }
        return provider.generateImage({ ...providerInput, model: route.model });
      }
      case "video": {
        const provider = this.providers.getVideo(route.providerId);
        if (!provider) {
          throw new Error(`No video provider is configured for ${route.providerId}`);
        }
        return [await provider.generateVideo({ ...providerInput, model: route.model })];
      }
    }
  }
}
