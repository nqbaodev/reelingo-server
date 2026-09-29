import type { Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/core/http";
import { endpoints } from "@/shared/http/endpoints";
import type { ConversationController } from "../controllers/conversation.controller";
import {
  createConversationSchema,
  conversationNameSchema,
  conversationParamsSchema,
  listConversationsQuerySchema,
  projectConversationParamsSchema,
} from "../dtos/conversation.dto";

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
      method: HttpMethod.POST,
      path: endpoints.projects.conversations,
      middlewares: [
        validate({
          params: projectConversationParamsSchema,
          body: createConversationSchema,
        }),
      ],
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
