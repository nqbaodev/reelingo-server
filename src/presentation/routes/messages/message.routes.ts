import type { Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/presentation/http";
import { endpoints } from "@/presentation/http/endpoints";
import type { MessageController } from "@/presentation/controllers/messages/message.controller";
import {
  listMessagesQuerySchema,
  messageConversationParamsSchema,
  messageResponseParamsSchema,
  sendMessageSchema,
} from "@/presentation/dtos/messages/message.dto";
import { requireEventStream } from "@/presentation/middlewares/messages/event-stream-acceptance.middleware";

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
