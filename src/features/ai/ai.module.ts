import { config } from "@/config";
import { GeminiClient, type ChatClient } from "./infrastructure";

export function createAiModule(chatClient?: ChatClient) {
  const client = chatClient ?? new GeminiClient(config.ai.gemini);

  return {
    client,
  };
}
