import { rateLimit } from "express-rate-limit";
import { config } from "@/config";
import { TooManyRequestsError } from "@/core/errors";
import { I18n } from "@/core/i18n";

export function createApiRateLimiter() {
  return rateLimit({
    windowMs: config.rateLimit.api.windowMs,
    limit: config.rateLimit.api.limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new TooManyRequestsError(I18n.tooManyRequests)),
  });
}
