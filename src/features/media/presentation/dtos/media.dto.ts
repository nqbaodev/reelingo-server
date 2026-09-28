import { z } from "zod";
import { MAX_MEDIA_DELETE_COUNT } from "@/config";
import type { MediaType } from "../../domain";

export const deleteMediaSchema = z.strictObject({
  mediaIds: z.array(z.uuid()).min(1).max(MAX_MEDIA_DELETE_COUNT),
});

export const mediaParamsSchema = z.strictObject({
  mediaId: z.uuid(),
});

export type DeleteMediaRequestDto = z.infer<typeof deleteMediaSchema>;
export type MediaParamsDto = z.infer<typeof mediaParamsSchema>;

export interface MediaResponseDto {
  id: string;
  type: MediaType;
  path: string;
  url: string;
  mimeType: string;
  createdAt: string;
}

export interface MediaLinkDto {
  id: string;
  path: string;
  url: string;
}

export interface DeletedMediaResponseDto {
  deletedIds: string[];
}
