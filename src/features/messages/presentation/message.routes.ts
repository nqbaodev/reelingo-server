import type { Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/core/http";
import { endpoints } from "@/shared/http/endpoints";
import type { MessageController } from "./message.controller";
import {
  createMessageSchema,
  listMessagesQuerySchema,
  messageConversationParamsSchema,
  messageResponseParamsSchema,
} from "./message.validators";

export function createMessageRouter(controller: MessageController): Router {
  return createBaseRouter([
    {
      method: HttpMethod.GET,
      path: endpoints.messages.events,
      handler: controller.events,
    },
    {
      method: HttpMethod.GET,
      path: endpoints.messages.response,
      middlewares: [validate({ params: messageResponseParamsSchema })],
      handler: controller.getResponse,
    },
    {
      method: HttpMethod.POST,
      path: endpoints.messages.response,
      middlewares: [validate({ params: messageResponseParamsSchema })],
      handler: controller.respond,
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
      path: endpoints.messages.byConversation,
      middlewares: [
        validate({
          params: messageConversationParamsSchema,
          body: createMessageSchema,
        }),
      ],
      handler: controller.create,
    },
  ]);
}
