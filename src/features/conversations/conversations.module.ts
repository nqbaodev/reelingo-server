import type { PrismaClient } from "@/generated/prisma/client";
import { ListConversationsUseCase, UpdateConversationNameUseCase } from "./application";
import { ConversationPrismaRepository } from "./infrastructure";
import { ConversationController, createConversationRouter } from "./presentation";

export function createConversationsModule(prisma: PrismaClient) {
  const conversations = new ConversationPrismaRepository(prisma);
  const controller = new ConversationController({
    listConversations: new ListConversationsUseCase(conversations),
    updateConversationName: new UpdateConversationNameUseCase(conversations),
  });

  return {
    router: createConversationRouter(controller),
  };
}
