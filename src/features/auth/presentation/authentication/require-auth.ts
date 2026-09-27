import type { Request } from "express";
import { UnauthorizedError } from "@/core/errors";
import { I18n } from "@/core/i18n";

/** Returns the context populated by the authentication middleware. */
export function requireAuth(req: Request): NonNullable<Request["auth"]> {
  if (!req.auth) {
    throw new UnauthorizedError(I18n.missingToken);
  }
  return req.auth;
}

/** Returns the authenticated user's id from the request context. */
export function requireCurrentUserId(req: Request): number {
  return requireAuth(req).user.id;
}
