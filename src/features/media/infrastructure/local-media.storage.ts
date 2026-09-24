import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { MediaType } from "../domain";
import type {
  MediaStorage,
  StoreGeneratedMediaInput,
  StoreImageInput,
} from "./media.storage";

const IMAGE_DIRECTORY = "images";
const VIDEO_DIRECTORY = "videos";

const GENERATED_MEDIA_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function isAlreadyExistsError(err: unknown): boolean {
  return (
    typeof err === "object" && err !== null && "code" in err && err.code === "EEXIST"
  );
}

export class LocalMediaStorage implements MediaStorage {
  private readonly absoluteRoot: string;

  constructor(root: string) {
    this.absoluteRoot = path.resolve(root);
  }

  async storeImage({ bytes, extension }: StoreImageInput): Promise<string> {
    return this.store(bytes, IMAGE_DIRECTORY, extension);
  }

  async storeGenerated({
    bytes,
    type,
    mimeType,
  }: StoreGeneratedMediaInput): Promise<string> {
    const extension = GENERATED_MEDIA_EXTENSIONS[mimeType];
    if (!extension) {
      throw new Error(`Generated media has unsupported MIME type: ${mimeType}`);
    }

    const directory = type === MediaType.IMAGE ? IMAGE_DIRECTORY : VIDEO_DIRECTORY;
    return this.store(bytes, directory, extension);
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
    const filePath = path.resolve(this.absoluteRoot, ...storageKey.split("/"));
    const relativePath = path.relative(this.absoluteRoot, filePath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new Error("Media storage key resolves outside the configured root");
    }

    return filePath;
  }
}
