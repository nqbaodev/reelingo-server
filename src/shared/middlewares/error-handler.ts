import type { NextFunction, Request, Response } from "express";
import {
  AppError,
  BadRequestError,
  NotFoundError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
} from "@/core/errors";
import { I18n, translate } from "@/core/i18n";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new NotFoundError(I18n.routeNotFound));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (res.headersSent) {
    _next(err);
    return;
  }
  const expected = normalizeHttpError(err);
  if (expected) {
    if (expected.statusCode >= 500) {
      req.log.error(
        {
          err: expected,
          statusCode: expected.statusCode,
          errorCode: expected.code,
        },
        expected.message,
      );
    }
    res.status(expected.statusCode).json({
      success: false,
      message: translate(expected.messageKey, req.language, expected.params),
      error: {
        code: expected.code,
        ...(expected.details !== undefined && { details: expected.details }),
      },
    });
    return;
  }

  req.log.error(
    { err, statusCode: 500, errorCode: "INTERNAL_SERVER_ERROR" },
    "Unhandled error",
  );
  res.status(500).json({
    success: false,
    message: translate(I18n.somethingWentWrong, req.language),
    error: {
      code: "INTERNAL_SERVER_ERROR",
    },
  });
}

function normalizeHttpError(err: unknown): AppError | undefined {
  if (err instanceof AppError) return err;
  // Only normalize known body-parser errors; never echo their body or message.
  if (err instanceof Error && "type" in err) {
    const cause = err;
    if (err.type === "entity.parse.failed") {
      return new BadRequestError(I18n.invalidJson, { cause });
    }
    if (err.type === "entity.too.large" || err.type === "parameters.too.many") {
      return new PayloadTooLargeError(I18n.payloadTooLarge, { cause });
    }
    if (err.type === "encoding.unsupported" || err.type === "charset.unsupported") {
      return new UnsupportedMediaTypeError(I18n.unsupportedEncoding, { cause });
    }
    if (err.type === "request.aborted" || err.type === "request.size.invalid") {
      return new BadRequestError(I18n.invalidRequest, { cause });
    }
  }
  return undefined;
}
