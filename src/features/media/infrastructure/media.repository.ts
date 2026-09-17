import type { Media, NewMedia } from "../domain";

export interface MediaRepository {
  create(media: NewMedia): Promise<Media>;
  findOwnedById(id: string, userId: number): Promise<Media | null>;
}
