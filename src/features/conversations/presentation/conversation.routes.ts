import type { Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/core/http";
import { endpoints } from "@/shared/http/endpoints";
import type { ConversationController } from "./conversation.controller";
import {
  conversationNameSchema,
  conversationParamsSchema,
  listConversationsQuerySchema,
} from "./conversation.validators";

export function createConversationRouter(controller: ConversationController): Router {
  return createBaseRouter([
    {
      method: HttpMethod.GET,
      path: endpoints.conversations.root,
      middlewares: [validate({ query: listConversationsQuerySchema })],
      handler: controller.list,
    },
    {
      method: HttpMethod.POST,
      path: endpoints.conversations.root,
      middlewares: [validate({ body: conversationNameSchema })],
      handler: controller.create,
    },
    {
      method: HttpMethod.PATCH,
      path: endpoints.conversations.byId,
      middlewares: [
        validate({ params: conversationParamsSchema, body: conversationNameSchema }),
      ],
      handler: controller.updateName,
    },
  ]);
}
