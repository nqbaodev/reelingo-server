import type { Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/core/http";
import { endpoints } from "@/shared/http/endpoints";
import type { MessageController } from "../controllers/message.controller";
import {
  listMessagesQuerySchema,
  messageConversationParamsSchema,
  messageResponseParamsSchema,
  sendMessageSchema,
} from "../dtos/message.dto";
import { requireEventStream } from "../middlewares/event-stream-acceptance.middleware";

export function createMessageRouter(controller: MessageController): Router {
  return createBaseRouter([
    {
      method: HttpMethod.GET,
      path: endpoints.messages.response,
      middlewares: [validate({ params: messageResponseParamsSchema })],
      handler: controller.getResponse,
    },
    {
      method: HttpMethod.GET,
      path: endpoints.messages.byConversation,
      middlewares: [
        validate({
          params: messageConversationParamsSchema,
          query: listMessagesQuerySchema,
        }),
      ],
      handler: controller.list,
    },
    {
      method: HttpMethod.POST,
      path: endpoints.conversations.root,
      middlewares: [
        requireEventStream,
        validate({
          body: sendMessageSchema,
        }),
      ],
      handler: controller.send,
    },
  ]);
}
