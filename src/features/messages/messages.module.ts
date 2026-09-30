import { config } from "@/config";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ChatClient } from "@/features/ai/infrastructure";
import { CHAT_RUN_LEASE_BUFFER_MS } from "@/features/ai/domain";
import {
  CreateMessageUseCase,
  GenerateAssistantResponseUseCase,
  GetMessageResponseUseCase,
  ListMessagesUseCase,
  SendMessageUseCase,
} from "./application";
import { MessagePrismaRepository } from "./infrastructure";
import { MessageController, createMessageRouter } from "./presentation";

export function createMessagesModule(prisma: PrismaClient, chatClient: ChatClient) {
  const messages = new MessagePrismaRepository(prisma);
  const createMessage = new CreateMessageUseCase(messages);
  const generateAssistantResponse = new GenerateAssistantResponseUseCase(
    messages,
    chatClient,
    config.ai.gemini.timeoutMs + CHAT_RUN_LEASE_BUFFER_MS,
  );
  const controller = new MessageController({
    getMessageResponse: new GetMessageResponseUseCase(messages),
    listMessages: new ListMessagesUseCase(messages),
    sendMessage: new SendMessageUseCase(createMessage, generateAssistantResponse),
  });

  return {
    router: createMessageRouter(controller),
  };
}
