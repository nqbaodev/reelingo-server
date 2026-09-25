import { UnsupportedMediaTypeError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import { detectSupportedImage, MediaType, type Media } from "../../domain";
import type { MediaRepository, MediaStorage } from "../../infrastructure";

export class UploadImageUseCase {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: MediaStorage,
  ) {}

  async execute(userId: number, bytes: Uint8Array): Promise<Media> {
    const image = detectSupportedImage(bytes);
    if (!image) {
      throw new UnsupportedMediaTypeError(I18n.unsupportedImageType);
    }

    const storageKey = await this.storage.storeImage({
      bytes,
      extension: image.extension,
    });

    try {
      return await this.media.create({
        userId,
        type: MediaType.IMAGE,
        storageKey,
        mimeType: image.mimeType,
      });
    } catch (err) {
      try {
        await this.storage.delete(storageKey);
      } catch (cleanupError) {
        throw new AggregateError(
          [err, cleanupError],
          "Failed to persist media and remove its stored file",
          { cause: cleanupError },
        );
      }
      throw err;
    }
  }
}
