import type { Media, NewMedia } from "../../domain";

export interface DeletedMedia {
  id: string;
  storageKey: string;
}

export interface MediaRepository {
  create(media: NewMedia): Promise<Media>;
  findOwnedById(id: string, userId: number): Promise<Media | null>;
  deleteUnusedOwnedByIds(ids: readonly string[], userId: number): Promise<DeletedMedia[]>;
}
