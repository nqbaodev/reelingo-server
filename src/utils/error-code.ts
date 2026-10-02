/** Reads a string error code from an unknown provider or runtime error. */
export function getErrorCode(err: unknown): string | null {
  if (
    typeof err !== "object" ||
    err === null ||
    !("code" in err) ||
    typeof err.code !== "string"
  ) {
    return null;
  }

  return err.code;
}
