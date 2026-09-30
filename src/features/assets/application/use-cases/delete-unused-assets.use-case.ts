import type { AssetRepository, AssetStorage } from "../../infrastructure";

export class DeleteUnusedAssetsUseCase {
  constructor(
    private readonly assets: AssetRepository,
    private readonly storage: AssetStorage,
  ) {}

  async execute(userId: number, assetIds: readonly string[]): Promise<string[]> {
    const deletedAssets = await this.assets.deleteUnusedOwnedByIds(assetIds, userId);

    await Promise.all(
      deletedAssets.map((asset) => this.storage.delete(asset.storageKey)),
    );

    return deletedAssets.map((asset) => asset.id);
  }
}
