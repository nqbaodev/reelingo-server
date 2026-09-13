import type { GenerativeAiClient } from "../infrastructure";

export class GenerateTextUseCase {
  constructor(private readonly aiClient: GenerativeAiClient) {}

  execute(prompt: string): Promise<string> {
    return this.aiClient.generateText(prompt);
  }
}
