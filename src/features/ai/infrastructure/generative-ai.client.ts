export interface GenerativeAiClient {
  generateText(prompt: string): Promise<string>;
}

export class GenerativeAiUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}
