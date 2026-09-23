import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { AiGenerationStatus as PrismaAiGenerationStatus } from "@/generated/prisma/enums";
import { MediaType } from "@/features/media/domain";
import { parseAiGenerationConfig } from "../domain";
import type {
  AiGenerationRepository,
  ClaimedAiGeneration,
  ClaimNextAiGenerationInput,
} from "./ai-generation.repository";

interface ClaimedAiGenerationRow {
  id: string;
  triggerMessageId: string;
  conversationId: string;
  userId: number;
  prompt: string | null;
  type: string;
  configSnapshot: unknown;
  claimVersion: Date;
}

interface ClaimVersionRow {
  claimVersion: Date;
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function toMediaType(type: string): MediaType {
  switch (type) {
    case MediaType.IMAGE:
      return MediaType.IMAGE;
    case MediaType.VIDEO:
      return MediaType.VIDEO;
    default:
      throw new Error(`AI generation has unsupported media type: ${type}`);
  }
}

function toClaimedGeneration(row: ClaimedAiGenerationRow): ClaimedAiGeneration {
  if (!isValidDate(row.claimVersion)) {
    throw new Error("AI generation claim has an invalid version");
  }

  return {
    id: row.id,
    triggerMessageId: row.triggerMessageId,
    conversationId: row.conversationId,
    userId: row.userId,
    prompt: row.prompt,
    type: toMediaType(row.type),
    config: parseAiGenerationConfig(row.configSnapshot),
    claimVersion: row.claimVersion,
  };
}

export class AiGenerationPrismaRepository implements AiGenerationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async claimNext({
    staleBefore,
  }: ClaimNextAiGenerationInput): Promise<ClaimedAiGeneration | null> {
    if (!isValidDate(staleBefore)) {
      throw new RangeError("AI generation stale boundary must be a valid date");
    }

    const rows = await this.prisma.$queryRaw<ClaimedAiGenerationRow[]>(Prisma.sql`
      WITH pending_candidate AS MATERIALIZED (
        SELECT generation."id"
        FROM "ai_generations" AS generation
        WHERE generation."status" = 'pending'::"ai_generation_status"
        ORDER BY generation."created_at", generation."id"
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      ),
      stale_candidate AS MATERIALIZED (
        SELECT generation."id"
        FROM "ai_generations" AS generation
        WHERE generation."status" = 'processing'::"ai_generation_status"
          AND generation."updated_at" < ${staleBefore}
          AND NOT EXISTS (SELECT 1 FROM pending_candidate)
        ORDER BY generation."updated_at", generation."id"
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      ),
      candidate AS (
        SELECT "id" FROM pending_candidate
        UNION ALL
        SELECT "id" FROM stale_candidate
        LIMIT 1
      ),
      claimed AS (
        UPDATE "ai_generations" AS generation
        SET
          "status" = 'processing'::"ai_generation_status",
          "updated_at" = CURRENT_TIMESTAMP
        FROM candidate
        WHERE generation."id" = candidate."id"
        RETURNING
          generation."id",
          generation."trigger_message_id",
          generation."type",
          generation."config_snapshot",
          generation."updated_at"
      )
      SELECT
        claimed."id",
        claimed."trigger_message_id" AS "triggerMessageId",
        message."conversation_id" AS "conversationId",
        conversation."user_id" AS "userId",
        message."content" AS "prompt",
        claimed."type"::text AS "type",
        claimed."config_snapshot" AS "configSnapshot",
        claimed."updated_at" AS "claimVersion"
      FROM claimed
      JOIN "messages" AS message
        ON message."id" = claimed."trigger_message_id"
      JOIN "conversations" AS conversation
        ON conversation."id" = message."conversation_id"
    `);

    const [row] = rows;
    if (!row) return null;

    try {
      return toClaimedGeneration(row);
    } catch (err) {
      if (isValidDate(row.claimVersion)) {
        await this.failClaim(row.id, row.claimVersion);
      }
      throw err;
    }
  }

  async renewClaim(id: string, claimVersion: Date): Promise<Date | null> {
    const rows = await this.prisma.$queryRaw<ClaimVersionRow[]>(Prisma.sql`
      UPDATE "ai_generations"
      SET "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}::uuid
        AND "status" = 'processing'::"ai_generation_status"
        AND "updated_at" = ${claimVersion}
      RETURNING "updated_at" AS "claimVersion"
    `);

    const [row] = rows;
    if (!row) return null;

    const { claimVersion: renewedVersion } = row;
    if (!isValidDate(renewedVersion)) {
      throw new Error("Renewed AI generation claim has an invalid version");
    }

    return renewedVersion;
  }

  async failClaim(id: string, claimVersion: Date): Promise<boolean> {
    const result = await this.prisma.aiGeneration.updateMany({
      where: {
        id,
        status: PrismaAiGenerationStatus.processing,
        updatedAt: claimVersion,
      },
      data: { status: PrismaAiGenerationStatus.failed },
    });

    return result.count === 1;
  }
}
