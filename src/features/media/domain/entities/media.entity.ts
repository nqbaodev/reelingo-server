export const MediaType = {
  IMAGE: "image",
  VIDEO: "video",
} as const;

export type MediaType = (typeof MediaType)[keyof typeof MediaType];

export interface Media {
  id: string;
  userId: number;
  type: MediaType;
  storageKey: string;
  mimeType: string;
  createdAt: Date;
}

export interface NewMedia {
  userId: number;
  type: MediaType;
  storageKey: string;
  mimeType: string;
}
