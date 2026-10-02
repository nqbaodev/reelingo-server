import type { SupportedImageExtension } from "@/utils";

export interface StoreUploadedImageInput {
  userId: number;
  bytes: Uint8Array;
  extension: SupportedImageExtension;
}

export interface StoreGeneratedAssetInput {
  userId: number;
  bytes: Uint8Array;
  mimeType: string;
}

export interface AssetStorage {
  storeUploadedImage(input: StoreUploadedImageInput): Promise<string>;
  storeGenerated(input: StoreGeneratedAssetInput): Promise<string>;
  read(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
}
