export const AssetKind = {
  IMAGE: "image",
  VIDEO: "video",
} as const;

export type AssetKind = (typeof AssetKind)[keyof typeof AssetKind];

export interface Asset {
  id: string;
  userId: number;
  kind: AssetKind;
  storageKey: string;
  mimeType: string;
  createdAt: Date;
}

export interface NewAsset {
  userId: number;
  kind: AssetKind;
  storageKey: string;
  mimeType: string;
}
