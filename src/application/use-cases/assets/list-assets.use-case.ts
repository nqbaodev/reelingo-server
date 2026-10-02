import type { CursorPage } from "@/application/pagination";
import type { Asset, AssetKind } from "@/domain";
import type {
  AssetListCursor,
  AssetRepository,
} from "@/application/interfaces/repositories/asset.repository";

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
