import type { AgentInput, AgentResult } from "../domain/chat";
import type { AgentRunner, TextDeltaListener } from "../runtime/agent-runner";

export class RespondToChatWorkflow {
  constructor(private readonly agent: AgentRunner) {}

  execute(
    input: AgentInput,
    signal: AbortSignal,
    onTextDelta?: TextDeltaListener,
  ): Promise<AgentResult> {
    return this.agent.respond(input, signal, onTextDelta);
  }
}
