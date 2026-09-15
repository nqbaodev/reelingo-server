import { createCursorPage, type CursorPage } from "@/core/pagination";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { isPrismaRecordNotFound } from "@/shared/database/prisma-error";
import { MediaType, type Message, type NewMessage } from "../domain";
import { toEntity } from "./message.mapper";
import type {
  CreateMessageForConversationInput,
  ListMessagesInput,
  MessageListCursor,
  MessageRepository,
} from "./message.repository";

function toCreateData(message: NewMessage): Prisma.MessageUncheckedCreateInput {
  const base = {
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
  };

  if (!message.media) {
    return base;
  }

  if (message.media.type === MediaType.IMAGE) {
    return {
      ...base,
      mediaType: MediaType.IMAGE,
      mediaUrl: message.media.url,
      mimeType: message.media.mimeType,
    };
  }

  return {
    ...base,
    mediaType: MediaType.VIDEO,
    mediaUrl: message.media.url,
    thumbnailUrl: message.media.thumbnailUrl,
    mimeType: message.media.mimeType,
    duration: message.media.duration,
  };
}

export class MessagePrismaRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createForConversation({
    userId,
    message,
  }: CreateMessageForConversationInput): Promise<Message | null> {
    try {
      const record = await this.prisma.$transaction(async (transaction) => {
        await transaction.conversation.update({
          where: { id: message.conversationId, userId },
          data: { updatedAt: new Date() },
        });

        return transaction.message.create({
          data: toCreateData(message),
        });
      });

      return toEntity(record);
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
    });
    const messages = records.map(toEntity);

    return createCursorPage(messages, limit, (message) => ({
      createdAt: message.createdAt,
      id: message.id,
    }));
  }
}
