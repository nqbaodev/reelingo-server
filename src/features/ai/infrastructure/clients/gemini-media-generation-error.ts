import {
  MediaGenerationFailureType,
  MediaGenerationUnavailableError,
} from "@/services/ai";

const BLOCKED_PROVIDER_CODES = new Set([
  "blocklist",
  "content_blocked",
  "image_prohibited_content",
  "image_recitation",
  "image_safety",
  "prohibited_content",
  "recitation",
  "safety",
  "spii",
]);

const INVALID_PROVIDER_CODES = new Set([
  "failed_precondition",
  "invalid_argument",
  "invalid_request",
  "out_of_range",
  "parameter_unknown",
  "quota_exceeded",
]);

const RETRYABLE_PROVIDER_CODES = new Set([
  "api_error",
  "deadline_exceeded",
  "internal",
  "rate_limit_exceeded",
  "resource_exhausted",
  "service_unavailable",
  "too_many_requests",
  "unavailable",
]);

interface ProviderFailure {
  failureType: MediaGenerationFailureType;
  providerCode: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function providerErrorRecords(error: unknown): Record<string, unknown>[] {
  const outer = asRecord(error);
  const inner = asRecord(outer?.error);
  return [outer, inner].filter(
    (record): record is Record<string, unknown> => record !== null,
  );
}

function normalizeProviderCode(value: unknown): string | null {
  return typeof value === "string"
    ? value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_")
    : null;
}

function classifySingleProviderError(error: unknown): ProviderFailure {
  const records = providerErrorRecords(error);
  const providerCode =
    records
      .flatMap((record) => [record.code, record.status, record.reason])
      .map(normalizeProviderCode)
      .find((value): value is string => value !== null) ?? null;
  const statusCode = records
    .flatMap((record) => [record.statusCode, record.status, record.code])
    .find((value): value is number => typeof value === "number");

  if (providerCode && BLOCKED_PROVIDER_CODES.has(providerCode)) {
    return { failureType: MediaGenerationFailureType.BLOCKED, providerCode };
  }
  if (
    (providerCode && INVALID_PROVIDER_CODES.has(providerCode)) ||
    statusCode === 400 ||
    statusCode === 412 ||
    statusCode === 416 ||
    statusCode === 422
  ) {
    return { failureType: MediaGenerationFailureType.INVALID, providerCode };
  }
  if (
    (providerCode && RETRYABLE_PROVIDER_CODES.has(providerCode)) ||
    statusCode === 429 ||
    (statusCode !== undefined && statusCode >= 500)
  ) {
    return { failureType: MediaGenerationFailureType.RETRYABLE, providerCode };
  }

  return { failureType: MediaGenerationFailureType.UNKNOWN, providerCode };
}

function classifyProviderError(error: unknown): ProviderFailure {
  if (error instanceof MediaGenerationUnavailableError) {
    return { failureType: error.failureType, providerCode: error.providerCode };
  }
  if (error instanceof AggregateError) {
    const failures = error.errors.map(classifyProviderError);
    return (
      failures.find(
        (failure) => failure.failureType === MediaGenerationFailureType.BLOCKED,
      ) ??
      failures.find(
        (failure) => failure.failureType === MediaGenerationFailureType.INVALID,
      ) ??
      failures.find(
        (failure) => failure.failureType === MediaGenerationFailureType.RETRYABLE,
      ) ??
      failures.at(0) ??
      classifySingleProviderError(error)
    );
  }
  return classifySingleProviderError(error);
}

export function toGeminiMediaGenerationError(message: string, cause: unknown): Error {
  if (cause instanceof MediaGenerationUnavailableError) {
    return cause;
  }
  const failure = classifyProviderError(cause);
  return new MediaGenerationUnavailableError(message, { cause, ...failure });
}
