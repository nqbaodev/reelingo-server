import type { SupportedImageExtension } from "../domain";

export interface StoreImageInput {
  bytes: Uint8Array;
  extension: SupportedImageExtension;
}

export interface MediaStorage {
  storeImage(input: StoreImageInput): Promise<string>;
  read(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
}
