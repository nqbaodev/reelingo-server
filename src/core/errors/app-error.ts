export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string, readonly details?: unknown) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
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
