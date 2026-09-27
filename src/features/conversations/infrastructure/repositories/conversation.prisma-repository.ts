import { MessageRole, Prisma, type PrismaClient } from "@/generated/prisma/client";
import { createCursorPage, type CursorPage } from "@/core/pagination";
import { isPrismaRecordNotFound } from "@/shared/database/prisma-error";
import type { Conversation, ConversationSummary } from "../../domain";
import { toEntity } from "../mappers/conversation.mapper";
import type {
  CreateConversationInput,
  ConversationListCursor,
  ConversationRepository,
  ListConversationsInput,
} from "./conversation.repository";

interface ConversationSummaryRow {
  id: string;
  userId: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function toConversationSummary(row: ConversationSummaryRow): ConversationSummary {
  if (
    !isValidDate(row.createdAt) ||
    !isValidDate(row.updatedAt) ||
    !isValidDate(row.lastMessageAt)
  ) {
    throw new Error("Conversation query returned an invalid timestamp");
  }

  return {
    ...toEntity(row),
    lastMessageAt: row.lastMessageAt,
  };
}

export class ConversationPrismaRepository implements ConversationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create({
    userId,
    name,
    firstMessageContent,
  }: CreateConversationInput): Promise<Conversation> {
    const record = await this.prisma.conversation.create({
      data: {
        userId,
        name,
        messages: {
          create: {
            role: MessageRole.user,
            content: firstMessageContent,
            triggeredChatRun: {
              create: {
                contextSnapshot: {
                  intentHint: null,
                  generationSettings: {},
                },
              },
            },
          },
        },
      },
    });
    return toEntity(record);
  }

  async listByUser({
    userId,
    limit,
    cursor,
  }: ListConversationsInput): Promise<
    CursorPage<ConversationSummary, ConversationListCursor>
  > {
    const cursorCondition = cursor
      ? Prisma.sql`
          AND (
            activity."lastMessageAt" < ${cursor.lastMessageAt}
            OR (
              activity."lastMessageAt" = ${cursor.lastMessageAt}
              AND activity."id" < ${cursor.conversationId}::uuid
            )
          )
        `
      : Prisma.sql``;
    const rows = await this.prisma.$queryRaw<ConversationSummaryRow[]>(Prisma.sql`
      WITH activity AS (
        SELECT
          conversation."id",
          conversation."user_id" AS "userId",
          conversation."name",
          conversation."created_at" AS "createdAt",
          conversation."updated_at" AS "updatedAt",
          COALESCE(
            latest_message."created_at",
            conversation."created_at"
          ) AS "lastMessageAt"
        FROM "conversations" AS conversation
        LEFT JOIN LATERAL (
          SELECT message."created_at"
          FROM "messages" AS message
          WHERE message."conversation_id" = conversation."id"
          ORDER BY message."created_at" DESC, message."id" DESC
          LIMIT 1
        ) AS latest_message ON TRUE
        WHERE conversation."user_id" = ${userId}
      )
      SELECT
        activity."id",
        activity."userId",
        activity."name",
        activity."createdAt",
        activity."updatedAt",
        activity."lastMessageAt"
      FROM activity
      WHERE TRUE
      ${cursorCondition}
      ORDER BY activity."lastMessageAt" DESC, activity."id" DESC
      LIMIT ${limit + 1}
    `);
    const summaries = rows.map(toConversationSummary);

    return createCursorPage(summaries, limit, (conversation) => ({
      lastMessageAt: conversation.lastMessageAt,
      conversationId: conversation.id,
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
