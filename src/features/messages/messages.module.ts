import { config } from "@/config";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ChatClient } from "@/features/ai/infrastructure";
import { CHAT_RUN_LEASE_BUFFER_MS } from "@/features/ai/domain";
import type { AiGenerationEvents } from "@/features/ai/application";
import {
  CreateMessageUseCase,
  GetMessageResponseUseCase,
  ListMessagesUseCase,
  RespondToMessageUseCase,
} from "./application";
import { MessagePrismaRepository } from "./infrastructure";
import { MessageController, createMessageRouter } from "./presentation";

export function createMessagesModule(
  prisma: PrismaClient,
  chatClient: ChatClient,
  generationEvents: AiGenerationEvents,
) {
  const messages = new MessagePrismaRepository(prisma);
  const controller = new MessageController({
    createMessage: new CreateMessageUseCase(messages),
    getMessageResponse: new GetMessageResponseUseCase(messages),
    listMessages: new ListMessagesUseCase(messages),
    respondToMessage: new RespondToMessageUseCase(
      messages,
      chatClient,
      config.ai.gemini.timeoutMs + CHAT_RUN_LEASE_BUFFER_MS,
    ),
    generationEvents,
  });

  return {
    router: createMessageRouter(controller),
  };
}
