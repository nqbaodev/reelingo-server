import { config } from "@/config";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  DeleteMediaUseCase,
  GetMediaContentUseCase,
  UploadImageUseCase,
} from "./application";
import { LocalMediaStorage, MediaPrismaRepository } from "./infrastructure";
import { createMediaRouter, MediaController } from "./presentation";

export function createMediaModule(prisma: PrismaClient) {
  const media = new MediaPrismaRepository(prisma);
  const storage = new LocalMediaStorage(config.media.storageRoot);
  const controller = new MediaController({
    deleteMedia: new DeleteMediaUseCase(media, storage),
    getMediaContent: new GetMediaContentUseCase(media, storage),
    uploadImage: new UploadImageUseCase(media, storage),
  });

  return {
    router: createMediaRouter(controller),
  };
}
