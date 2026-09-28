import { config } from "@/config";
import { endpoints } from "@/shared/http/endpoints";
import type { Media } from "../../domain";
import type {
  DeletedMediaResponseDto,
  MediaLinkDto,
  MediaResponseDto,
} from "../dtos/media.dto";

export function getMediaPath(mediaId: string): string {
  return `${endpoints.apiPrefix}${endpoints.media.byId.replace(":mediaId", mediaId)}`;
}

export function toMediaLink(id: string): MediaLinkDto {
  const path = getMediaPath(id);
  return { id, path, url: new URL(path, config.server.publicBaseUrl).toString() };
}

export function toMediaResponse(media: Media): MediaResponseDto {
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

export function toDeletedMediaResponse(
  deletedIds: string[],
): DeletedMediaResponseDto {
  return { deletedIds };
}
