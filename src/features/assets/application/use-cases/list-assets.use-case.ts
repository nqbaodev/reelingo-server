import type { CursorPage } from "@/core/pagination";
import type { Asset, AssetKind } from "../../domain";
import type { AssetListCursor, AssetRepository } from "../../infrastructure";

export interface ListAssetsOptions {
  kind: AssetKind | undefined;
  limit: number;
  cursor: AssetListCursor | undefined;
}

export class ListAssetsUseCase {
  constructor(private readonly assets: AssetRepository) {}

  execute(
    userId: number,
    options: ListAssetsOptions,
  ): Promise<CursorPage<Asset, AssetListCursor>> {
    return this.assets.listOwned({ userId, ...options });
  }
}
