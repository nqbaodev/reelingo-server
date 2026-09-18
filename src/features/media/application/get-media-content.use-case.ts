import { NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import type { Media } from "../domain";
import type { MediaRepository, MediaStorage } from "../infrastructure";

export interface MediaContent {
  bytes: Uint8Array;
  media: Media;
}

export class GetMediaContentUseCase {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: MediaStorage,
  ) {}

  async execute(userId: number, mediaId: string): Promise<MediaContent> {
    const media = await this.media.findOwnedById(mediaId, userId);
    if (!media) {
      throw new NotFoundError(I18n.mediaNotFound);
    }

    return {
      bytes: await this.storage.read(media.storageKey),
      media,
    };
  }
}
