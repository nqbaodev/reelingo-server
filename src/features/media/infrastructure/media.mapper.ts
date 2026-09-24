import {
  MediaType as PrismaMediaType,
  type Media as PrismaMedia,
} from "@/generated/prisma/client";
import {
  isSupportedImageMimeType,
  MediaType,
  type Media,
} from "../domain";

function toMediaType(type: PrismaMediaType): MediaType {
  switch (type) {
    case PrismaMediaType.image:
      return MediaType.IMAGE;
    case PrismaMediaType.video:
      return MediaType.VIDEO;
  }
}

export function toEntity(record: PrismaMedia): Media {
  if (
    record.type === PrismaMediaType.image &&
    !isSupportedImageMimeType(record.mimeType)
  ) {
    throw new Error("Media record has an unsupported image MIME type");
  }

  return {
    id: record.id,
    userId: record.userId,
    type: toMediaType(record.type),
    storageKey: record.storageKey,
    mimeType: record.mimeType,
    createdAt: record.createdAt,
  };
}
