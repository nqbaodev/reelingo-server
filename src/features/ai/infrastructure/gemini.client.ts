import { GoogleGenAI } from "@google/genai";
import {
  GenerativeAiUnavailableError,
  type GenerativeAiClient,
} from "./generative-ai.client";

interface GeminiClientConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export class GeminiClient implements GenerativeAiClient {
  private readonly client: GoogleGenAI;

  constructor(private readonly config: GeminiClientConfig) {
    this.client = new GoogleGenAI({
      apiKey: config.apiKey,
      httpOptions: {
        timeout: config.timeoutMs,
        retryOptions: { attempts: 1 },
      },
    });
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const response = await this.client.models.generateContent({
        model: this.config.model,
        contents: prompt,
      });
      const text = response.text?.trim();

      if (!text) {
        throw new Error("Gemini returned an empty response");
      }

      return text;
    } catch (err) {
      throw new GenerativeAiUnavailableError(
        "Gemini text generation is unavailable",
        { cause: err },
      );
    }
  }
}
