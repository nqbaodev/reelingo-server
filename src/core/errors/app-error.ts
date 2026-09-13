import type { MessageKey, MessageParams } from "@/core/i18n";

export interface AppErrorOptions {
  /** Placeholders interpolated into the translated message. */
  params?: MessageParams;
  /** The underlying failure; kept for logs, never sent to the client. */
  cause?: unknown;
  /** Structured, client-safe data returned in the error envelope. */
  details?: unknown;
}

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  readonly params: MessageParams;
  readonly details: unknown;

  constructor(
    readonly messageKey: MessageKey,
    { params = {}, cause, details }: AppErrorOptions = {},
  ) {
    super(messageKey, cause === undefined ? undefined : { cause });
    this.name = new.target.name;
    this.params = params;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "NOT_FOUND";
}

export class ValidationError extends AppError {
  readonly statusCode = 422;
  readonly code = "VALIDATION_ERROR";
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = "CONFLICT";
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = "UNAUTHORIZED";
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";
}

export class ServiceUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly code = "SERVICE_UNAVAILABLE";
}

export class BadRequestError extends AppError {
  readonly statusCode = 400;
  readonly code = "BAD_REQUEST";
}

export class PayloadTooLargeError extends AppError {
  readonly statusCode = 413;
  readonly code = "PAYLOAD_TOO_LARGE";
}

export class UnsupportedMediaTypeError extends AppError {
  readonly statusCode = 415;
  readonly code = "UNSUPPORTED_MEDIA_TYPE";
}

export class TooManyRequestsError extends AppError {
  readonly statusCode = 429;
  readonly code = "TOO_MANY_REQUESTS";
}
