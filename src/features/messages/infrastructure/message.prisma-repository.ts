import { createCursorPage, type CursorPage } from "@/core/pagination";
import {
  ChatRunStatus,
  parseChatContext,
  type AiGenerationConfig,
  type ChatContext,
} from "@/features/ai/domain";
import { MediaType } from "@/features/media/domain";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { isPrismaRecordNotFound } from "@/shared/database/prisma-error";
import { MessageRole, type Message } from "../domain";
import { toEntity, toMessageChatRun } from "./message.mapper";
import type {
  ChatTurn,
  ClaimChatInput,
  ClaimChatResult,
  CompleteChatGenerationInput,
  CompleteChatReplyInput,
  CreateMessageForConversationInput,
  CreateMessageForConversationResult,
  GetMessageResponseInput,
  ListMessagesInput,
  MessageListCursor,
  MessageResponseState,
  MessageRepository,
} from "./message.repository";
import {
  ClaimChatResultType,
  CreateMessageResultType,
} from "./message.repository";

const messageRelations = {
  mediaLinks: { orderBy: { position: "asc" } },
  triggeredGeneration: true,
  generationResult: true,
  triggeredChatRun: true,
  chatRunResult: true,
} as const satisfies Prisma.MessageInclude;

interface CompleteChatInput {
  runId: string;
  claimVersion: Date;
  content: string;
  generation?: {
    type: MediaType;
    config: AiGenerationConfig;
  };
}

function toChatContextSnapshot(context: ChatContext): Prisma.InputJsonObject {
  const imageConfig = context.generationSettings[MediaType.IMAGE];
  const videoConfig = context.generationSettings[MediaType.VIDEO];

  return {
    intentHint: context.intentHint,
    generationSettings: {
      ...(imageConfig ? { [MediaType.IMAGE]: { ...imageConfig } } : {}),
      ...(videoConfig ? { [MediaType.VIDEO]: { ...videoConfig } } : {}),
    },
  };
}

export class MessagePrismaRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createForConversation({
    userId,
    message,
    chatContext,
  }: CreateMessageForConversationInput): Promise<CreateMessageForConversationResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const conversation = await transaction.conversation.findFirst({
          where: { id: message.conversationId, userId },
          select: { id: true },
        });
        if (!conversation) {
          return { type: CreateMessageResultType.CONVERSATION_NOT_FOUND };
        }

        if (message.mediaIds.length > 0) {
          const ownedMediaCount = await transaction.media.count({
            where: { id: { in: message.mediaIds }, userId },
          });
          if (ownedMediaCount !== message.mediaIds.length) {
            return { type: CreateMessageResultType.MEDIA_NOT_FOUND };
          }
        }

        await transaction.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        const record = await transaction.message.create({
          data: {
            conversationId: message.conversationId,
            role: message.role,
            content: message.content,
            mediaLinks: {
              create: message.mediaIds.map((mediaId, position) => ({
                mediaId,
                position,
              })),
            },
            triggeredChatRun: {
              create: {
                contextSnapshot: toChatContextSnapshot(chatContext),
              },
            },
          },
          include: messageRelations,
        });

        return {
          type: CreateMessageResultType.CREATED,
          message: toEntity(record),
        };
      });
    } catch (err) {
      if (isPrismaRecordNotFound(err)) {
        return { type: CreateMessageResultType.CONVERSATION_NOT_FOUND };
      }
      throw err;
    }
  }

  async claimChat({
    userId,
    conversationId,
    triggerMessageId,
    staleBefore,
  }: ClaimChatInput): Promise<ClaimChatResult> {
    return this.prisma.$transaction(async (transaction) => {
      const run = await transaction.chatRun.findFirst({
        where: {
          triggerMessageId,
          triggerMessage: {
            conversationId,
            conversation: { userId },
          },
        },
        include: {
          triggerMessage: { include: messageRelations },
          resultMessage: { include: messageRelations },
        },
      });
      if (!run) {
        return { type: ClaimChatResultType.NOT_FOUND };
      }

      if (run.status === ChatRunStatus.COMPLETED) {
        if (!run.resultMessage) {
          throw new Error("Completed chat run has no result message");
        }
        return {
          type: ClaimChatResultType.COMPLETED,
          turn: {
            userMessage: toEntity(run.triggerMessage),
            assistantMessage: toEntity(run.resultMessage),
          },
        };
      }

      const claimVersion = new Date();
      const claimed = await transaction.chatRun.updateMany({
        where: {
          id: run.id,
          OR: [
            { status: ChatRunStatus.PENDING },
            { status: ChatRunStatus.FAILED },
            {
              status: ChatRunStatus.PROCESSING,
              updatedAt: { lt: staleBefore },
            },
          ],
        },
        data: {
          status: ChatRunStatus.PROCESSING,
          updatedAt: claimVersion,
        },
      });
      if (claimed.count === 0) {
        return { type: ClaimChatResultType.BUSY };
      }

      return {
        type: ClaimChatResultType.CLAIMED,
        runId: run.id,
        claimVersion,
        triggerMessage: toEntity(run.triggerMessage),
        context: parseChatContext(run.contextSnapshot),
      };
    });
  }

  async getResponse({
    userId,
    conversationId,
    triggerMessageId,
  }: GetMessageResponseInput): Promise<MessageResponseState | null> {
    const run = await this.prisma.chatRun.findFirst({
      where: {
        triggerMessageId,
        triggerMessage: {
          conversationId,
          conversation: { userId },
        },
      },
      select: {
        id: true,
        status: true,
        resultMessageId: true,
        resultMessage: { include: messageRelations },
      },
    });
    if (!run) {
      return null;
    }
    if (run.status === ChatRunStatus.COMPLETED && !run.resultMessage) {
      throw new Error("Completed chat run has no result message");
    }

    return {
      chatRun: toMessageChatRun(run),
      assistantMessage: run.resultMessage
        ? toEntity(run.resultMessage)
        : null,
    };
  }

  async completeChatReply({
    runId,
    claimVersion,
    content,
  }: CompleteChatReplyInput): Promise<ChatTurn | null> {
    return this.completeChat({ runId, claimVersion, content });
  }

  async completeChatGeneration({
    runId,
    claimVersion,
    content,
    type,
    config,
  }: CompleteChatGenerationInput): Promise<ChatTurn | null> {
    return this.completeChat({
      runId,
      claimVersion,
      content,
      generation: { type, config },
    });
  }

  async failChat(runId: string, claimVersion: Date): Promise<void> {
    await this.prisma.chatRun.updateMany({
      where: {
        id: runId,
        status: ChatRunStatus.PROCESSING,
        updatedAt: claimVersion,
      },
      data: { status: ChatRunStatus.FAILED },
    });
  }

  private async completeChat({
    runId,
    claimVersion,
    content,
    generation,
  }: CompleteChatInput): Promise<ChatTurn | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const run = await transaction.chatRun.findFirst({
          where: {
            id: runId,
            status: ChatRunStatus.PROCESSING,
            updatedAt: claimVersion,
          },
          select: {
            triggerMessageId: true,
            triggerMessage: { select: { conversationId: true } },
          },
        });
        if (!run) {
          return null;
        }

        const userRecord = await transaction.message.update({
          where: { id: run.triggerMessageId },
          data: generation
            ? {
                triggeredGeneration: {
                  create: {
                    type: generation.type,
                    configSnapshot: { ...generation.config },
                  },
                },
              }
            : {},
          include: messageRelations,
        });

        await transaction.conversation.update({
          where: { id: run.triggerMessage.conversationId },
          data: { updatedAt: new Date() },
        });
        const assistantRecord = await transaction.message.create({
          data: {
            conversationId: run.triggerMessage.conversationId,
            role: MessageRole.ASSISTANT,
            content,
          },
          include: messageRelations,
        });

        await transaction.chatRun.update({
          where: { id: runId },
          data: {
            status: ChatRunStatus.COMPLETED,
            resultMessageId: assistantRecord.id,
          },
        });

        const completedUserRecord = await transaction.message.findUniqueOrThrow({
          where: { id: userRecord.id },
          include: messageRelations,
        });
        const completedAssistantRecord =
          await transaction.message.findUniqueOrThrow({
            where: { id: assistantRecord.id },
            include: messageRelations,
          });

        return {
          userMessage: toEntity(completedUserRecord),
          assistantMessage: toEntity(completedAssistantRecord),
        };
      });
    } catch (err) {
      if (isPrismaRecordNotFound(err)) {
        return null;
      }
      throw err;
    }
  }

  async listByConversation({
    userId,
    conversationId,
    limit,
    cursor,
  }: ListMessagesInput): Promise<CursorPage<Message, MessageListCursor> | null> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });
    if (!conversation) {
      return null;
    }

    const records = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                {
                  createdAt: cursor.createdAt,
                  id: { lt: cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: messageRelations,
    });
    const messages = records.map(toEntity);

    return createCursorPage(messages, limit, (message) => ({
      createdAt: message.createdAt,
      id: message.id,
    }));
  }
}
