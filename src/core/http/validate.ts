import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { ValidationError } from "@/core/errors";
import { I18n, zodErrorMap } from "@/core/i18n";

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

export interface ValidationIssue {
  path: string;
  message: string;
}

function toValidationIssues(err: ZodError): ValidationIssue[] {
  return err.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
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
    // Per-parse error map keeps Zod's issue messages in the request language
    // without mutating Zod's global config across concurrent requests.
    const options = { error: zodErrorMap(req.language) };
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body, options);
      }
      if (schemas.query) {
        req.validatedQuery = schemas.query.parse(req.query, options);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params, options) as typeof req.params;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          new ValidationError(I18n.validationFailed, {
            cause: err,
            details: toValidationIssues(err),
          }),
        );
        return;
      }
      next(err);
    }
  };
}
