import { config } from "@/config";
import type { MediaGenerationRouteResolver } from "@/features/ai/application";
import { CHAT_RUN_LEASE_BUFFER_MS } from "@/features/ai/domain";
import type { ChatClient } from "@/features/ai/infrastructure";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  CreateMessageUseCase,
  GenerateAssistantResponseUseCase,
  GetMessageResponseUseCase,
  ListMessagesUseCase,
  SendMessageUseCase,
} from "./application";
import { MessagePrismaRepository } from "./infrastructure";
import { MessageController, createMessageRouter } from "./presentation";

export function createMessagesModule(
  prisma: PrismaClient,
  chatClient: ChatClient,
  mediaRouteResolver: MediaGenerationRouteResolver,
) {
  const messages = new MessagePrismaRepository(prisma);
  const createMessage = new CreateMessageUseCase(messages);
  const generateAssistantResponse = new GenerateAssistantResponseUseCase(
    messages,
    chatClient,
    mediaRouteResolver,
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
