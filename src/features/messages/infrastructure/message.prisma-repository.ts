import { createCursorPage, type CursorPage } from "@/core/pagination";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { isPrismaRecordNotFound } from "@/shared/database/prisma-error";
import type { Message, NewMessage } from "../domain";
import { toEntity } from "./message.mapper";
import type {
  CreateMessageForConversationInput,
  CreateMessageForConversationResult,
  ListMessagesInput,
  MessageListCursor,
  MessageRepository,
} from "./message.repository";
import { CreateMessageResultType } from "./message.repository";

function toCreateData(message: NewMessage): Prisma.MessageUncheckedCreateInput {
  return {
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    mediaId: message.mediaId,
  };
}

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

        if (message.mediaId !== null) {
          const media = await transaction.media.findFirst({
            where: { id: message.mediaId, userId },
            select: { id: true },
          });
          if (!media) {
            return { type: CreateMessageResultType.MEDIA_NOT_FOUND };
          }
        }

        await transaction.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        const record = await transaction.message.create({
          data: toCreateData(message),
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
    });
    const messages = records.map(toEntity);

    return createCursorPage(messages, limit, (message) => ({
      createdAt: message.createdAt,
      id: message.id,
    }));
  }
}
