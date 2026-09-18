import type { MediaRepository, MediaStorage } from "../infrastructure";

export class DeleteMediaUseCase {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: MediaStorage,
  ) {}

  async execute(userId: number, mediaIds: readonly string[]): Promise<string[]> {
    const deletedMedia = await this.media.deleteUnusedOwnedByIds(mediaIds, userId);

    await Promise.all(
      deletedMedia.map((media) => this.storage.delete(media.storageKey)),
    );

    return deletedMedia.map((media) => media.id);
  }
}
