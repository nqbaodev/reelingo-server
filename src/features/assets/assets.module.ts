import { config } from "@/config";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  DeleteUnusedAssetsUseCase,
  GetAssetContentUseCase,
  ListAssetsUseCase,
  UploadImageUseCase,
} from "./application";
import { LocalAssetStorage, AssetPrismaRepository } from "./infrastructure";
import { AssetController, createAssetRouter } from "./presentation";

export function createAssetsModule(prisma: PrismaClient) {
  const assets = new AssetPrismaRepository(prisma);
  const storage = new LocalAssetStorage(config.storage.root);
  const controller = new AssetController({
    deleteUnusedAssets: new DeleteUnusedAssetsUseCase(assets, storage),
    getAssetContent: new GetAssetContentUseCase(assets, storage),
    listAssets: new ListAssetsUseCase(assets),
    uploadImage: new UploadImageUseCase(assets, storage),
  });

  return {
    router: createAssetRouter(controller),
    storage,
  };
}
