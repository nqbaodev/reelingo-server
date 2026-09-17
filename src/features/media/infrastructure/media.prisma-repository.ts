import type { PrismaClient } from "@/generated/prisma/client";
import { MediaType as PrismaMediaType } from "@/generated/prisma/enums";
import { MediaType, type Media, type NewMedia } from "../domain";
import { toEntity } from "./media.mapper";
import type { MediaRepository } from "./media.repository";

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
}
