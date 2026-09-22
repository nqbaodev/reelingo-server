import type { ChatInput, ChatResult } from "../domain";

export type ChatTextDeltaHandler = (delta: string) => Promise<void>;

export interface ChatClient {
  respond(input: ChatInput, onTextDelta?: ChatTextDeltaHandler): Promise<ChatResult>;
}

export class ChatUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}
