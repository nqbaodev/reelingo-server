import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { MediaType as PrismaMediaType } from "@/generated/prisma/enums";
import { MediaType, type Media, type NewMedia } from "../domain";
import { toEntity } from "./media.mapper";
import type { DeletedMedia, MediaRepository } from "./media.repository";

function toPrismaMediaType(type: MediaType): PrismaMediaType {
  switch (type) {
    case MediaType.IMAGE:
      return PrismaMediaType.image;
  }
}

export class MediaPrismaRepository implements MediaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(media: NewMedia): Promise<Media> {
    const record = await this.prisma.media.create({
      data: {
        userId: media.userId,
        type: toPrismaMediaType(media.type),
        storageKey: media.storageKey,
        mimeType: media.mimeType,
      },
    });

    return toEntity(record);
  }

  async findOwnedById(id: string, userId: number): Promise<Media | null> {
    const record = await this.prisma.media.findFirst({
      where: { id, userId },
    });

    return record ? toEntity(record) : null;
  }

  async deleteUnusedOwnedByIds(
    ids: readonly string[],
    userId: number,
  ): Promise<DeletedMedia[]> {
    if (ids.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(ids)];

    return this.prisma.$queryRaw<DeletedMedia[]>(Prisma.sql`
      DELETE FROM "media" AS media
      WHERE media."user_id" = ${userId}
        AND media."id" IN (${Prisma.join(uniqueIds)})
        AND NOT EXISTS (
          SELECT 1
          FROM "messages" AS message
          WHERE message."media_id" = media."id"
        )
      RETURNING media."id", media."storage_key" AS "storageKey"
    `);
  }
}
