import { Router } from "express";
import { ZodError } from "zod";
import { AgentUnavailableError } from "@reelingo/agent-core/runtime/agent-runner";
import type { RespondToChatWorkflow } from "@reelingo/agent-core/workflows/respond-to-chat.workflow";
import {
  CHAT_PROTOCOL_VERSION,
  chatRequestSchema,
  type ChatEvent,
} from "@reelingo/contracts/chat.contract";
import { createServiceAuth } from "./service-auth.middleware";

function encodeEvent(event: ChatEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export function createChatRouter(
  respondToChat: RespondToChatWorkflow,
  serviceToken: string,
): Router {
  const router = Router();

  router.post(
    "/v1/chat/respond",
    createServiceAuth(serviceToken),
    async (request, response) => {
      let input;
      try {
        input = chatRequestSchema.parse(request.body);
      } catch (error) {
        if (error instanceof ZodError) {
          response.status(400).json({ error: "INVALID_REQUEST" });
          return;
        }
        throw error;
      }

      response.status(200);
      response.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.flushHeaders();

      const abortController = new AbortController();
      response.once("close", () => abortController.abort());

      const send = (event: ChatEvent): void => {
        if (!response.writableEnded && !response.destroyed) {
          response.write(encodeEvent(event));
        }
      };

      try {
        const result = await respondToChat.execute(
          { content: input.content, intentHint: input.intentHint },
          abortController.signal,
          async (delta) => {
            send({
              protocolVersion: CHAT_PROTOCOL_VERSION,
              requestId: input.requestId,
              type: "assistant.delta",
              delta,
            });
          },
        );
        send({
          protocolVersion: CHAT_PROTOCOL_VERSION,
          requestId: input.requestId,
          type: "response.completed",
          result,
        });
      } catch (error) {
        if (!(error instanceof AgentUnavailableError)) {
          console.error("Unexpected AI agent response failure", error);
        }
        send({
          protocolVersion: CHAT_PROTOCOL_VERSION,
          requestId: input.requestId,
          type: "response.failed",
          code: "AGENT_UNAVAILABLE",
        });
      } finally {
        response.end();
      }
    },
  );

  return router;
}
