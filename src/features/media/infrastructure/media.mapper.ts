import {
  MediaType as PrismaMediaType,
  type Media as PrismaMedia,
} from "@/generated/prisma/client";
import {
  isSupportedImageMimeType,
  MediaType,
  type Media,
  type SupportedImageMimeType,
} from "../domain";

function toMediaType(type: PrismaMediaType): MediaType {
  switch (type) {
    case PrismaMediaType.image:
      return MediaType.IMAGE;
    case PrismaMediaType.video:
      throw new Error("Video media is not supported by the media feature yet");
  }
}

function toImageMimeType(mimeType: string): SupportedImageMimeType {
  if (!isSupportedImageMimeType(mimeType)) {
    throw new Error("Media record has an unsupported image MIME type");
  }

  return mimeType;
}

export function toEntity(record: PrismaMedia): Media {
  return {
    id: record.id,
    userId: record.userId,
    type: toMediaType(record.type),
    storageKey: record.storageKey,
    mimeType: toImageMimeType(record.mimeType),
    createdAt: record.createdAt,
  };
}
