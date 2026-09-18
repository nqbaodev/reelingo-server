import type { PrismaClient } from "@/generated/prisma/client";
import { CreateMessageUseCase, ListMessagesUseCase } from "./application";
import { MessagePrismaRepository } from "./infrastructure";
import { MessageController, createMessageRouter } from "./presentation";

export function createMessagesModule(prisma: PrismaClient) {
  const messages = new MessagePrismaRepository(prisma);
  const controller = new MessageController({
    createMessage: new CreateMessageUseCase(messages),
    listMessages: new ListMessagesUseCase(messages),
  });

  return {
    router: createMessageRouter(controller),
  };
}
