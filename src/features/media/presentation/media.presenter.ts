import { config } from "@/config";
import { endpoints } from "@/shared/http/endpoints";
import type { Media, MediaType } from "../domain";

export interface MediaResponse {
  id: string;
  type: MediaType;
  path: string;
  url: string;
  mimeType: string;
  createdAt: string;
}

export interface DeletedMediaResponse {
  deletedIds: string[];
}

export function getMediaPath(mediaId: string): string {
  return `${endpoints.apiPrefix}${endpoints.media.byId.replace(":mediaId", mediaId)}`;
}

export function toMediaLink(id: string): { id: string; path: string; url: string } {
  const path = getMediaPath(id);
  return { id, path, url: new URL(path, config.server.publicBaseUrl).toString() };
}

export function toMediaResponse(media: Media): MediaResponse {
  const contentPath = getMediaPath(media.id);

  return {
    id: media.id,
    type: media.type,
    path: contentPath,
    url: new URL(contentPath, config.server.publicBaseUrl).toString(),
    mimeType: media.mimeType,
    createdAt: media.createdAt.toISOString(),
  };
}

export function toDeletedMediaResponse(deletedIds: string[]): DeletedMediaResponse {
  return { deletedIds };
}
