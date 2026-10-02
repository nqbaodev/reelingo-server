import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { createCursorPage, type CursorPage } from "@/application/pagination";
import { isValidDate } from "@/utils";
import { isPrismaRecordNotFound } from "@/infrastructure/database/prisma/prisma-error";
import type { Conversation, ConversationSummary } from "@/domain";
import { toEntity } from "@/infrastructure/mappers/conversations/conversation.mapper";
import type {
  ConversationListCursor,
  ConversationRepository,
  ListConversationsInput,
} from "@/application/interfaces/repositories/conversation.repository";

interface ConversationSummaryRow {
  id: string;
  projectId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
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

  async listByProject({
    userId,
    projectId,
    limit,
    cursor,
  }: ListConversationsInput): Promise<CursorPage<
    ConversationSummary,
    ConversationListCursor
  > | null> {
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
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) return null;

    const rows = await this.prisma.$queryRaw<ConversationSummaryRow[]>(Prisma.sql`
      WITH activity AS (
        SELECT
          conversation."id",
          conversation."project_id" AS "projectId",
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
        WHERE conversation."project_id" = ${projectId}::uuid
      )
      SELECT
        activity."id",
        activity."projectId",
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
        where: { id, project: { userId } },
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
