import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MediaStorage, StoreImageInput } from "./media.storage";

const IMAGE_DIRECTORY = "images";

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
    const storageKey = path.posix.join(IMAGE_DIRECTORY, `${randomUUID()}.${extension}`);
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
