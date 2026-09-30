import {
  AssetKind as PrismaAssetKind,
  type Asset as PrismaAsset,
} from "@/generated/prisma/client";
import { isSupportedImageMimeType } from "@/core/utils";
import { AssetKind, type Asset } from "../../domain";

function toAssetKind(kind: PrismaAssetKind): AssetKind {
  switch (kind) {
    case PrismaAssetKind.image:
      return AssetKind.IMAGE;
    case PrismaAssetKind.video:
      return AssetKind.VIDEO;
  }
}

export function toEntity(record: PrismaAsset): Asset {
  if (
    record.kind === PrismaAssetKind.image &&
    !isSupportedImageMimeType(record.mimeType)
  ) {
    throw new Error("Asset record has an unsupported image MIME type");
  }

  return {
    id: record.id,
    userId: record.userId,
    kind: toAssetKind(record.kind),
    storageKey: record.storageKey,
    mimeType: record.mimeType,
    createdAt: record.createdAt,
  };
}
