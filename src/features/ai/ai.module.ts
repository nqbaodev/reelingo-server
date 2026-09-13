import { config } from "@/config";
import { GenerateTextUseCase } from "./application";
import { GeminiClient, type GenerativeAiClient } from "./infrastructure";
import { AiController, createAiRouter } from "./presentation";

export function createAiModule(aiClient?: GenerativeAiClient) {
  const client = aiClient ?? new GeminiClient(config.ai.gemini);
  const controller = new AiController({
    generateText: new GenerateTextUseCase(client),
  });

  return {
    router: createAiRouter(controller),
  };
}
