import { config } from "@/config";
import {
  encodeCursor,
  type CursorListResponse,
  type CursorPage,
} from "@/application/pagination";
import { endpoints } from "@/presentation/http/endpoints";
import type { Asset } from "@/domain";
import type { AssetListCursor } from "@/application/interfaces/repositories/asset.repository";
import type {
  AssetLinkDto,
  AssetResponseDto,
  DeletedAssetsResponseDto,
} from "@/presentation/dtos/assets/asset.dto";

export function getAssetPath(assetId: string): string {
  return `${endpoints.apiPrefix}${endpoints.assets.byId.replace(":assetId", assetId)}`;
}

export function toAssetLink(id: string): AssetLinkDto {
  const path = getAssetPath(id);
  return { id, path, url: new URL(path, config.server.publicBaseUrl).toString() };
}

export function toAssetResponse(asset: Asset): AssetResponseDto {
  const contentPath = getAssetPath(asset.id);

  return {
    id: asset.id,
    kind: asset.kind,
    path: contentPath,
    url: new URL(contentPath, config.server.publicBaseUrl).toString(),
    mimeType: asset.mimeType,
    createdAt: asset.createdAt.toISOString(),
  };
}

export function toAssetListResponse(
  page: CursorPage<Asset, AssetListCursor>,
): CursorListResponse<AssetResponseDto> {
  return {
    items: page.items.map(toAssetResponse),
    nextCursor: page.nextCursor
      ? encodeCursor({
          createdAt: page.nextCursor.createdAt.toISOString(),
          assetId: page.nextCursor.assetId,
        })
      : null,
  };
}

export function toDeletedAssetsResponse(deletedIds: string[]): DeletedAssetsResponseDto {
  return { deletedIds };
}
