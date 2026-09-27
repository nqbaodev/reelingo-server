export const IMAGE_MIME_TYPE = {
  JPEG: "image/jpeg",
  PNG: "image/png",
  WEBP: "image/webp",
} as const;

export const IMAGE_FILE_EXTENSION = {
  JPEG: "jpg",
  PNG: "png",
  WEBP: "webp",
} as const;

export const IMAGE_FILE_SIGNATURE = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  RIFF: [0x52, 0x49, 0x46, 0x46],
  WEBP: [0x57, 0x45, 0x42, 0x50],
} as const;

export const SUPPORTED_IMAGE_MIME_TYPES = [
  IMAGE_MIME_TYPE.JPEG,
  IMAGE_MIME_TYPE.PNG,
  IMAGE_MIME_TYPE.WEBP,
] as const;

export const SUPPORTED_IMAGE_FORMATS = [
  {
    extension: IMAGE_FILE_EXTENSION.JPEG,
    mimeType: IMAGE_MIME_TYPE.JPEG,
    signatures: [{ offset: 0, bytes: IMAGE_FILE_SIGNATURE.JPEG }],
  },
  {
    extension: IMAGE_FILE_EXTENSION.PNG,
    mimeType: IMAGE_MIME_TYPE.PNG,
    signatures: [
      {
        offset: 0,
        bytes: IMAGE_FILE_SIGNATURE.PNG,
      },
    ],
  },
  {
    extension: IMAGE_FILE_EXTENSION.WEBP,
    mimeType: IMAGE_MIME_TYPE.WEBP,
    signatures: [
      { offset: 0, bytes: IMAGE_FILE_SIGNATURE.RIFF },
      { offset: 8, bytes: IMAGE_FILE_SIGNATURE.WEBP },
    ],
  },
] as const;

export type SupportedImageMimeType = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];
export type SupportedImageExtension =
  (typeof IMAGE_FILE_EXTENSION)[keyof typeof IMAGE_FILE_EXTENSION];
