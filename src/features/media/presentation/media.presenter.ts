import { config } from "@/config";
import { endpoints } from "@/shared/http/endpoints";
import type { Media, MediaType, SupportedImageMimeType } from "../domain";

export interface MediaResponse {
  id: string;
  type: MediaType;
  path: string;
  url: string;
  mimeType: SupportedImageMimeType;
  createdAt: string;
}

export interface DeletedMediaResponse {
  deletedIds: string[];
}

function getMediaPath(mediaId: string): string {
  return `${endpoints.apiPrefix}${endpoints.media.byId.replace(":mediaId", mediaId)}`;
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
