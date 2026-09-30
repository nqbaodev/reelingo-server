import { UnsupportedMediaTypeError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import { detectSupportedImage } from "@/core/utils";
import { AssetKind, type Asset } from "../../domain";
import type { AssetRepository, AssetStorage } from "../../infrastructure";

export class UploadImageUseCase {
  constructor(
    private readonly assets: AssetRepository,
    private readonly storage: AssetStorage,
  ) {}

  async execute(userId: number, bytes: Uint8Array): Promise<Asset> {
    const image = detectSupportedImage(bytes);
    if (!image) {
      throw new UnsupportedMediaTypeError(I18n.unsupportedImageType);
    }

    const storageKey = await this.storage.storeUploadedImage({
      userId,
      bytes,
      extension: image.extension,
    });

    try {
      return await this.assets.create({
        userId,
        kind: AssetKind.IMAGE,
        storageKey,
        mimeType: image.mimeType,
      });
    } catch (err) {
      try {
        await this.storage.delete(storageKey);
      } catch (cleanupError) {
        throw new AggregateError(
          [err, cleanupError],
          "Failed to persist asset and remove its stored file",
          { cause: cleanupError },
        );
      }
      throw err;
    }
  }
}
