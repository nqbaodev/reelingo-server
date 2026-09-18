import {
  SUPPORTED_IMAGE_FORMATS,
  SUPPORTED_IMAGE_MIME_TYPES,
  type SupportedImageExtension,
  type SupportedImageMimeType,
} from "./image.constants";

export interface SupportedImage {
  extension: SupportedImageExtension;
  mimeType: SupportedImageMimeType;
}

function matchesSignature(
  bytes: Uint8Array,
  signature: { readonly offset: number; readonly bytes: readonly number[] },
): boolean {
  return signature.bytes.every(
    (value, index) => bytes[signature.offset + index] === value,
  );
}

export function detectSupportedImage(bytes: Uint8Array): SupportedImage | null {
  for (const format of SUPPORTED_IMAGE_FORMATS) {
    if (format.signatures.every((signature) => matchesSignature(bytes, signature))) {
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
