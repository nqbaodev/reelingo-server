export interface FileSignature {
  offset: number;
  bytes: readonly number[];
}

export function matchesFileSignature(
  content: Uint8Array,
  signature: FileSignature,
): boolean {
  if (content.length < signature.offset + signature.bytes.length) {
    return false;
  }

  return signature.bytes.every(
    (expectedByte, relativeIndex) =>
      content[signature.offset + relativeIndex] === expectedByte,
  );
}
