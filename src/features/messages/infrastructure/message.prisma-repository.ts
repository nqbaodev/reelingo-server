import { createCursorPage, type CursorPage } from "@/core/pagination";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { isPrismaRecordNotFound } from "@/shared/database/prisma-error";
import type { Message } from "../domain";
import { toEntity } from "./message.mapper";
import type {
  CreateMessageForConversationInput,
  CreateMessageForConversationResult,
  ListMessagesInput,
  MessageListCursor,
  MessageRepository,
} from "./message.repository";
import { CreateMessageResultType } from "./message.repository";

const messageRelations = {
  mediaLinks: { orderBy: { position: "asc" } },
  triggeredGeneration: true,
  generationResult: true,
} as const satisfies Prisma.MessageInclude;

export class MessagePrismaRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createForConversation({
    userId,
    message,
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
            triggeredGeneration: message.generation
              ? {
                  create: {
                    type: message.generation.type,
                    configSnapshot: { ...message.generation.config },
                  },
                }
              : undefined,
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
