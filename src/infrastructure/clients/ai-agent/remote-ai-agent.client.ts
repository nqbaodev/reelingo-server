import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  ChatUnavailableError,
  type ChatClient,
  type ChatTextDeltaHandler,
} from "@/application/interfaces/ai/chat.client";
import { AssetKind, ChatResultType, type ChatInput, type ChatResult } from "@/domain";

interface RemoteAiAgentClientConfig {
  baseUrl: string;
  serviceToken: string;
  timeoutMs: number;
}

const CHAT_PROTOCOL_VERSION = 1 as const;

const eventEnvelopeSchema = z.object({
  protocolVersion: z.literal(CHAT_PROTOCOL_VERSION),
  requestId: z.uuid(),
});

const chatEventSchema = z.discriminatedUnion("type", [
  eventEnvelopeSchema.extend({
    type: z.literal("assistant.delta"),
    delta: z.string().min(1),
  }),
  eventEnvelopeSchema.extend({
    type: z.literal("response.completed"),
    result: z.discriminatedUnion("type", [
      z.object({ type: z.literal("reply"), content: z.string().min(1) }),
      z.object({
        type: z.literal("generation"),
        mediaType: z.enum([AssetKind.IMAGE, AssetKind.VIDEO]),
      }),
    ]),
  }),
  eventEnvelopeSchema.extend({
    type: z.literal("response.failed"),
    code: z.string().min(1),
  }),
]);

type ChatEvent = z.infer<typeof chatEventSchema>;

function toChatResult(
  event: Extract<ChatEvent, { type: "response.completed" }>,
): ChatResult {
  if (event.result.type === "reply") {
    return { type: ChatResultType.REPLY, content: event.result.content };
  }
  return {
    type: ChatResultType.GENERATION,
    mediaType:
      event.result.mediaType === AssetKind.IMAGE ? AssetKind.IMAGE : AssetKind.VIDEO,
  };
}

export class RemoteAiAgentClient implements ChatClient {
  private readonly endpoint: URL;

  constructor(private readonly config: RemoteAiAgentClientConfig) {
    this.endpoint = new URL("/v1/chat/respond", config.baseUrl);
  }

  async respond(
    input: ChatInput,
    onTextDelta?: ChatTextDeltaHandler,
  ): Promise<ChatResult> {
    const requestId = randomUUID();
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.serviceToken}`,
          "content-type": "application/json",
          accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          protocolVersion: CHAT_PROTOCOL_VERSION,
          requestId,
          content: input.content,
          intentHint: input.intentHint,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`AI agent service returned HTTP ${response.status}`);
      }
      if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
        throw new Error("AI agent service returned an unsupported content type");
      }
      if (!response.body) {
        throw new Error("AI agent service returned an empty response body");
      }

      return await this.readResult(response.body, requestId, onTextDelta);
    } catch (error) {
      throw new ChatUnavailableError("Remote AI agent is unavailable", {
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readResult(
    body: ReadableStream<Uint8Array>,
    requestId: string,
    onTextDelta?: ChatTextDeltaHandler,
  ): Promise<ChatResult> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    let result: ChatResult | null = null;
    let textDeltaHandler = onTextDelta;

    const consumeLine = async (line: string): Promise<void> => {
      if (!line.trim()) return;

      const event = chatEventSchema.parse(JSON.parse(line));
      if (event.requestId !== requestId) {
        throw new Error("AI agent service returned a mismatched request id");
      }

      switch (event.type) {
        case "assistant.delta":
          if (textDeltaHandler) {
            try {
              await textDeltaHandler(event.delta);
            } catch {
              textDeltaHandler = undefined;
            }
          }
          return;
        case "response.completed":
          if (result) {
            throw new Error("AI agent service returned multiple completed events");
          }
          result = toChatResult(event);
          return;
        case "response.failed":
          throw new Error(`AI agent service failed with ${event.code}`);
      }
    };

    while (true) {
      const chunk = await reader.read();
      buffered += decoder.decode(chunk.value, { stream: !chunk.done });

      const lines = buffered.split("\n");
      buffered = lines.pop() ?? "";
      for (const line of lines) {
        await consumeLine(line);
      }

      if (chunk.done) break;
    }

    await consumeLine(buffered);
    if (!result) {
      throw new Error("AI agent service ended without a completed event");
    }
    return result;
  }
}
