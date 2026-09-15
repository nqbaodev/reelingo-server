import type { PrismaClient } from "@/generated/prisma/client";
import { createCursorPage, type CursorPage } from "@/core/pagination";
import { isPrismaRecordNotFound } from "@/shared/database/prisma-error";
import type { Conversation, NewConversation } from "../domain";
import { toEntity } from "./conversation.mapper";
import type {
  ConversationListCursor,
  ConversationRepository,
  ListConversationsInput,
} from "./conversation.repository";

export class ConversationPrismaRepository implements ConversationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: NewConversation): Promise<Conversation> {
    const record = await this.prisma.conversation.create({ data });
    return toEntity(record);
  }

  async listByUser({
    userId,
    limit,
    cursor,
  }: ListConversationsInput): Promise<CursorPage<Conversation, ConversationListCursor>> {
    const records = await this.prisma.conversation.findMany({
      where: {
        userId,
        ...(cursor
          ? {
              OR: [
                { updatedAt: { lt: cursor.updatedAt } },
                {
                  updatedAt: cursor.updatedAt,
                  id: { lt: cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const conversations = records.map(toEntity);

    return createCursorPage(conversations, limit, (conversation) => ({
      updatedAt: conversation.updatedAt,
      id: conversation.id,
    }));
  }

  async updateName(
    id: string,
    userId: number,
    name: string,
  ): Promise<Conversation | null> {
    try {
      const record = await this.prisma.conversation.update({
        where: { id, userId },
        data: { name },
      });
      return toEntity(record);
    } catch (err) {
      if (isPrismaRecordNotFound(err)) {
        return null;
      }
      throw err;
    }
  }
}
