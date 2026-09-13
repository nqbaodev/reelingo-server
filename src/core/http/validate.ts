import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { ValidationError } from "@/core/errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- augmenting Express's global types requires namespace syntax
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
    }
  }
}

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

function formatZodError(err: ZodError) {
  return err.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Validates req.body / req.query / req.params against Zod schemas and
 * replaces them with the parsed (and coerced) values on success.
 *
 * Express 5 defines req.query as a getter with no setter, so the parsed
 * query is exposed on req.validatedQuery rather than assigned back.
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.validatedQuery = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError("Request validation failed", formatZodError(err)));
        return;
      }
      next(err);
    }
  };
}
