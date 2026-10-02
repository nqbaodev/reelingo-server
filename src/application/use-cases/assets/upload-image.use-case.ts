import { UnsupportedMediaTypeError } from "@/application/errors";
import { I18n } from "@/application/i18n";
import { detectSupportedImage } from "@/utils";
import { AssetKind, type Asset } from "@/domain";
import type { AssetRepository } from "@/application/interfaces/repositories/asset.repository";
import type { AssetStorage } from "@/application/interfaces/storage/asset.storage";

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
