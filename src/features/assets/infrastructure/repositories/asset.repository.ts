import type { CursorPage } from "@/core/pagination";
import type { Asset, AssetKind, NewAsset } from "../../domain";

export interface DeletedAsset {
  id: string;
  storageKey: string;
}

export interface AssetListCursor {
  createdAt: Date;
  assetId: string;
}

export interface ListOwnedAssetsInput {
  userId: number;
  kind: AssetKind | undefined;
  limit: number;
  cursor: AssetListCursor | undefined;
}

export interface AssetRepository {
  create(asset: NewAsset): Promise<Asset>;
  findOwnedById(id: string, userId: number): Promise<Asset | null>;
  listOwned(input: ListOwnedAssetsInput): Promise<CursorPage<Asset, AssetListCursor>>;
  deleteUnusedOwnedByIds(ids: readonly string[], userId: number): Promise<DeletedAsset[]>;
}
