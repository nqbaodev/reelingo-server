import type { ChatInput, ChatResult } from "../../domain";

/** Rejection disables further delta delivery but does not cancel the AI response. */
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
