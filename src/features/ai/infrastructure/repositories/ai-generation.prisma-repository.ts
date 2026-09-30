import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { AiGenerationStatus as PrismaAiGenerationStatus } from "@/generated/prisma/enums";
import { MAX_MESSAGE_ASSET_COUNT } from "@/config";
import { isValidDate } from "@/core/utils";
import { AssetKind } from "@/features/assets/domain";
import { MessageRole, type Message } from "@/features/messages/domain";
import { AiGenerationStatus, parseAiGenerationConfig } from "../../domain";
import type {
  AiGenerationRepository,
  ClaimedAiGeneration,
  ClaimNextAiGenerationInput,
  CompleteAiGenerationInput,
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

class AiGenerationClaimLostError extends Error {}

function toAssetKind(type: string): AssetKind {
  switch (type) {
    case AssetKind.IMAGE:
      return AssetKind.IMAGE;
    case AssetKind.VIDEO:
      return AssetKind.VIDEO;
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
    type: toAssetKind(row.type),
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
        project."user_id" AS "userId",
        message."content" AS "prompt",
        claimed."type"::text AS "type",
        claimed."config_snapshot" AS "configSnapshot",
        claimed."updated_at" AS "claimVersion"
      FROM claimed
      JOIN "messages" AS message
        ON message."id" = claimed."trigger_message_id"
      JOIN "conversations" AS conversation
        ON conversation."id" = message."conversation_id"
      JOIN "projects" AS project
        ON project."id" = conversation."project_id"
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

  async completeClaim({
    id,
    claimVersion,
    content,
    media,
  }: CompleteAiGenerationInput): Promise<Message | null> {
    if (media.length < 1 || media.length > MAX_MESSAGE_ASSET_COUNT) {
      throw new RangeError(
        `AI generation result must contain between 1 and ${MAX_MESSAGE_ASSET_COUNT} media items`,
      );
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const generation = await transaction.aiGeneration.findFirst({
          where: {
            id,
            status: PrismaAiGenerationStatus.processing,
            updatedAt: claimVersion,
          },
          select: {
            id: true,
            triggerMessageId: true,
            type: true,
            configSnapshot: true,
            triggerMessage: {
              select: {
                conversationId: true,
                conversation: {
                  select: { project: { select: { userId: true } } },
                },
                triggeredChatRun: { select: { id: true, status: true } },
              },
            },
          },
        });
        if (!generation) return null;

        const assetRecords = [];
        for (const output of media) {
          assetRecords.push(
            await transaction.asset.create({
              data: {
                userId: generation.triggerMessage.conversation.project.userId,
                kind: generation.type,
                storageKey: output.storageKey,
                mimeType: output.mimeType,
              },
              select: { id: true },
            }),
          );
        }

        const resultMessage = await transaction.message.create({
          data: {
            conversationId: generation.triggerMessage.conversationId,
            role: MessageRole.ASSISTANT,
            content,
            assetLinks: {
              create: assetRecords.map(({ id: assetId }, position) => ({
                assetId,
                position,
              })),
            },
          },
          select: { id: true, createdAt: true },
        });

        const completed = await transaction.aiGeneration.updateMany({
          where: {
            id,
            status: PrismaAiGenerationStatus.processing,
            updatedAt: claimVersion,
          },
          data: {
            status: PrismaAiGenerationStatus.completed,
            resultMessageId: resultMessage.id,
          },
        });
        if (completed.count !== 1) {
          throw new AiGenerationClaimLostError();
        }

        const chatRun = generation.triggerMessage.triggeredChatRun;
        if (chatRun) {
          await transaction.chatRun.update({
            where: { id: chatRun.id },
            data: { resultMessageId: resultMessage.id },
          });
        }

        return {
          id: resultMessage.id,
          conversationId: generation.triggerMessage.conversationId,
          role: MessageRole.ASSISTANT,
          content,
          assetIds: assetRecords.map(({ id: assetId }) => assetId),
          generation: {
            id: generation.id,
            triggerMessageId: generation.triggerMessageId,
            type: toAssetKind(generation.type),
            status: AiGenerationStatus.COMPLETED,
            config: parseAiGenerationConfig(generation.configSnapshot),
            resultMessageId: resultMessage.id,
          },
          chatRun: chatRun
            ? {
                id: chatRun.id,
                status: chatRun.status,
                resultMessageId: resultMessage.id,
              }
            : null,
          createdAt: resultMessage.createdAt,
        };
      });
    } catch (err) {
      if (err instanceof AiGenerationClaimLostError) return null;
      throw err;
    }
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
