import {
  SUPPORTED_IMAGE_FORMATS,
  SUPPORTED_IMAGE_MIME_TYPES,
  type SupportedImageExtension,
  type SupportedImageMimeType,
} from "./image.constants";
import { matchesFileSignature } from "./file-signature";

export interface SupportedImage {
  extension: SupportedImageExtension;
  mimeType: SupportedImageMimeType;
}

export function detectSupportedImage(bytes: Uint8Array): SupportedImage | null {
  for (const format of SUPPORTED_IMAGE_FORMATS) {
    if (format.signatures.every((signature) => matchesFileSignature(bytes, signature))) {
      return {
        extension: format.extension,
        mimeType: format.mimeType,
      };
    }
  }

  return null;
}

export function isSupportedImageMimeType(
  mimeType: string,
): mimeType is SupportedImageMimeType {
  return SUPPORTED_IMAGE_MIME_TYPES.some((supported) => supported === mimeType);
}
