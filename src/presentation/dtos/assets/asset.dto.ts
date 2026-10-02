import { z } from "zod";
import { MAX_ASSET_DELETE_COUNT } from "@/application/constants";
import { createCursorSchema, paginationLimitSchema } from "@/application/pagination";
import type { AssetKind } from "@/domain";
import { AssetKind as AssetKindValue } from "@/domain";

export const deleteAssetsSchema = z.strictObject({
  assetIds: z.array(z.uuid()).min(1).max(MAX_ASSET_DELETE_COUNT),
});

export const assetParamsSchema = z.strictObject({
  assetId: z.uuid(),
});

export const assetKindSchema = z.enum([AssetKindValue.IMAGE, AssetKindValue.VIDEO]);

const assetCursorPayloadSchema = z.strictObject({
  createdAt: z.iso.datetime(),
  assetId: z.uuid(),
});

export const listAssetsQuerySchema = z
  .strictObject({
    kind: assetKindSchema.optional(),
    limit: paginationLimitSchema,
    cursor: createCursorSchema(assetCursorPayloadSchema).optional(),
  })
  .transform(({ kind, limit, cursor }) => ({
    kind,
    limit,
    cursor: cursor
      ? { createdAt: new Date(cursor.createdAt), assetId: cursor.assetId }
      : undefined,
  }));

export type DeleteAssetsRequestDto = z.infer<typeof deleteAssetsSchema>;
export type AssetParamsDto = z.infer<typeof assetParamsSchema>;
export type ListAssetsQueryDto = z.infer<typeof listAssetsQuerySchema>;

export interface AssetResponseDto {
  id: string;
  kind: AssetKind;
  path: string;
  url: string;
  mimeType: string;
  createdAt: string;
}

export interface AssetLinkDto {
  id: string;
  path: string;
  url: string;
}

export interface DeletedAssetsResponseDto {
  deletedIds: string[];
}
