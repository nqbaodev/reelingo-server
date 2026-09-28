import type { SupportedImageExtension } from "@/core/utils";

export interface StoreUploadedImageInput {
  userId: number;
  bytes: Uint8Array;
  extension: SupportedImageExtension;
}

export interface StoreGeneratedMediaInput {
  userId: number;
  bytes: Uint8Array;
  mimeType: string;
}

export interface MediaStorage {
  storeUploadedImage(input: StoreUploadedImageInput): Promise<string>;
  storeGenerated(input: StoreGeneratedMediaInput): Promise<string>;
  read(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
}
