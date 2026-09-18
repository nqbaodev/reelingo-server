import type { SupportedImageMimeType } from "./image.constants";

export const MediaType = {
  IMAGE: "image",
} as const;

export type MediaType = (typeof MediaType)[keyof typeof MediaType];

export interface Media {
  id: string;
  userId: number;
  type: MediaType;
  storageKey: string;
  mimeType: SupportedImageMimeType;
  createdAt: Date;
}

export interface NewMedia {
  userId: number;
  type: MediaType;
  storageKey: string;
  mimeType: SupportedImageMimeType;
}
