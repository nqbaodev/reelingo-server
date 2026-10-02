import type { Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/presentation/http";
import { endpoints } from "@/presentation/http/endpoints";
import type { ConversationController } from "@/presentation/controllers/conversations/conversation.controller";
import {
  conversationNameSchema,
  conversationParamsSchema,
  listConversationsQuerySchema,
  projectConversationParamsSchema,
} from "@/presentation/dtos/conversations/conversation.dto";

export function createConversationRouter(controller: ConversationController): Router {
  return createBaseRouter([
    {
      method: HttpMethod.GET,
      path: endpoints.projects.conversations,
      middlewares: [
        validate({
          params: projectConversationParamsSchema,
          query: listConversationsQuerySchema,
        }),
      ],
      handler: controller.list,
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
