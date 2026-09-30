import { MAX_CONVERSATION_NAME_LENGTH } from "@/config";
import { NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import type { Conversation } from "@/features/conversations/domain";
import { MessageRole, type CreateMessagePayload, type Message } from "../../domain";
import { CreateMessageResultType, type MessageRepository } from "../../infrastructure";

export interface CreatedMessage {
  message: Message;
  createdConversation: Conversation | null;
}

export const MessageTargetType = {
  NEW_CONVERSATION: "newConversation",
  EXISTING_CONVERSATION: "existingConversation",
} as const;

export type CreateMessageCommand =
  | {
      type: typeof MessageTargetType.NEW_CONVERSATION;
      projectId: string;
      message: CreateMessagePayload & { content: string };
    }
  | {
      type: typeof MessageTargetType.EXISTING_CONVERSATION;
      conversationId: string;
      message: CreateMessagePayload;
    };

function createInitialConversationName(content: string): string {
  return Array.from(content).slice(0, MAX_CONVERSATION_NAME_LENGTH).join("");
}

export class CreateMessageUseCase {
  constructor(private readonly messages: MessageRepository) {}

  async execute(userId: number, command: CreateMessageCommand): Promise<CreatedMessage> {
    if (command.type === MessageTargetType.NEW_CONVERSATION) {
      const { aiContext, ...messagePayload } = command.message;
      const createResult = await this.messages.createWithConversation({
        userId,
        projectId: command.projectId,
        conversationName: createInitialConversationName(command.message.content),
        chatContext: aiContext,
        message: {
          role: MessageRole.USER,
          ...messagePayload,
        },
      });
      if (createResult.type === CreateMessageResultType.ASSET_NOT_FOUND) {
        throw new NotFoundError(I18n.assetNotFound);
      }
      if (createResult.type === CreateMessageResultType.PROJECT_NOT_FOUND) {
        throw new NotFoundError(I18n.projectNotFound);
      }

      return {
        message: createResult.message,
        createdConversation: createResult.conversation,
      };
    }

    const { aiContext, ...messagePayload } = command.message;
    const createResult = await this.messages.createForConversation({
      userId,
      chatContext: aiContext,
      message: {
        conversationId: command.conversationId,
        role: MessageRole.USER,
        ...messagePayload,
      },
    });

    switch (createResult.type) {
      case CreateMessageResultType.CONVERSATION_NOT_FOUND:
        throw new NotFoundError(I18n.conversationNotFound);
      case CreateMessageResultType.ASSET_NOT_FOUND:
        throw new NotFoundError(I18n.assetNotFound);
    }

    return { message: createResult.message, createdConversation: null };
  }
}
