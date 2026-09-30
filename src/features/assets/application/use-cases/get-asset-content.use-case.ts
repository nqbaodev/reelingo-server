import { NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import type { Asset } from "../../domain";
import type { AssetRepository, AssetStorage } from "../../infrastructure";

export interface AssetContent {
  bytes: Uint8Array;
  asset: Asset;
}

export class GetAssetContentUseCase {
  constructor(
    private readonly assets: AssetRepository,
    private readonly storage: AssetStorage,
  ) {}

  async execute(userId: number, assetId: string): Promise<AssetContent> {
    const asset = await this.assets.findOwnedById(assetId, userId);
    if (!asset) {
      throw new NotFoundError(I18n.assetNotFound);
    }

    return {
      bytes: await this.storage.read(asset.storageKey),
      asset,
    };
  }
}
