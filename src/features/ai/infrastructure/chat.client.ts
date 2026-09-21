import type { ChatInput, ChatResult } from "../domain";

export interface ChatClient {
  respond(input: ChatInput): Promise<ChatResult>;
}

export class ChatUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}
