import type { AgentInput, AgentResult } from "../domain/chat";

export type TextDeltaListener = (delta: string) => Promise<void>;

export interface AgentRunner {
  respond(
    input: AgentInput,
    signal: AbortSignal,
    onTextDelta?: TextDeltaListener,
  ): Promise<AgentResult>;
}

export class AgentUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}
