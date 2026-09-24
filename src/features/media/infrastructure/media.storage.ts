import type { SupportedImageExtension } from "../domain";
import type { MediaType } from "../domain";

export interface StoreImageInput {
  bytes: Uint8Array;
  extension: SupportedImageExtension;
}

export interface StoreGeneratedMediaInput {
  bytes: Uint8Array;
  type: MediaType;
  mimeType: string;
}

export interface MediaStorage {
  storeImage(input: StoreImageInput): Promise<string>;
  storeGenerated(input: StoreGeneratedMediaInput): Promise<string>;
  read(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
}
