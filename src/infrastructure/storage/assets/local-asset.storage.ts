import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getErrorCode } from "@/utils";
import type {
  AssetStorage,
  StoreGeneratedAssetInput,
  StoreUploadedImageInput,
} from "@/application/interfaces/storage/asset.storage";

const ASSET_DIRECTORY = "assets";
const LEGACY_MEDIA_DIRECTORY = "media";
const UPLOAD_DIRECTORY = path.posix.join(ASSET_DIRECTORY, "uploads");
const GENERATED_DIRECTORY = path.posix.join(ASSET_DIRECTORY, "generated");
const LEGACY_UNSCOPED_DIRECTORIES = ["images", "videos"] as const;
const FILE_ALREADY_EXISTS_CODE = "EEXIST";

const GENERATED_ASSET_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function isAlreadyExistsError(err: unknown): boolean {
  return getErrorCode(err) === FILE_ALREADY_EXISTS_CODE;
}

export class LocalAssetStorage implements AssetStorage {
  private readonly absoluteRoot: string;

  constructor(root: string) {
    this.absoluteRoot = path.resolve(root);
  }

  async storeUploadedImage({
    userId,
    bytes,
    extension,
  }: StoreUploadedImageInput): Promise<string> {
    return this.store(
      bytes,
      path.posix.join(UPLOAD_DIRECTORY, String(userId)),
      extension,
    );
  }

  async storeGenerated({
    userId,
    bytes,
    mimeType,
  }: StoreGeneratedAssetInput): Promise<string> {
    const extension = GENERATED_ASSET_EXTENSIONS[mimeType];
    if (!extension) {
      throw new Error(`Generated asset has unsupported MIME type: ${mimeType}`);
    }

    return this.store(
      bytes,
      path.posix.join(GENERATED_DIRECTORY, String(userId)),
      extension,
    );
  }

  private async store(
    bytes: Uint8Array,
    directory: string,
    extension: string,
  ): Promise<string> {
    const storageKey = path.posix.join(directory, `${randomUUID()}.${extension}`);
    const filePath = this.resolveStorageKey(storageKey);
    await mkdir(path.dirname(filePath), { recursive: true });

    try {
      await writeFile(filePath, bytes, { flag: "wx" });
    } catch (err) {
      if (!isAlreadyExistsError(err)) {
        await rm(filePath, { force: true }).catch(() => undefined);
      }
      throw err;
    }

    return storageKey;
  }

  async read(storageKey: string): Promise<Uint8Array> {
    return readFile(this.resolveStorageKey(storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    await rm(this.resolveStorageKey(storageKey), { force: true });
  }

  private resolveStorageKey(storageKey: string): string {
    const namespacedKey = LEGACY_UNSCOPED_DIRECTORIES.some(
      (directory) => storageKey === directory || storageKey.startsWith(`${directory}/`),
    )
      ? path.posix.join(LEGACY_MEDIA_DIRECTORY, storageKey)
      : storageKey;
    const keyParts = namespacedKey.split("/");
    if (
      keyParts.length < 2 ||
      (keyParts[0] !== ASSET_DIRECTORY && keyParts[0] !== LEGACY_MEDIA_DIRECTORY) ||
      keyParts.some(
        (part) => !part || part === "." || part === ".." || part.includes("\\"),
      )
    ) {
      throw new Error("Asset storage key has an invalid path");
    }

    const filePath = path.resolve(this.absoluteRoot, ...keyParts);
    const relativePath = path.relative(this.absoluteRoot, filePath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new Error("Asset storage key resolves outside the configured root");
    }

    return filePath;
  }
}
