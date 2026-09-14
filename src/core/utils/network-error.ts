const NETWORK_ERROR_CODES: ReadonlySet<string> = new Set([
  "ENOTFOUND",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

/** Identifies network failures without deciding how a feature handles them. */
export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  return (
    ("code" in err &&
      typeof err.code === "string" &&
      NETWORK_ERROR_CODES.has(err.code)) ||
    err.name === "FetchError"
  );
}
