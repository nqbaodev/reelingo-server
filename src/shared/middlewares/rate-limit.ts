import { rateLimit } from "express-rate-limit";
import { config } from "@/config";
import { TooManyRequestsError } from "@/core/errors";
import { I18n } from "@/core/i18n";

interface RateLimitOptions {
  windowMs: number;
  limit: number;
}

function createRateLimiter(options: RateLimitOptions) {
  return rateLimit({
    ...options,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new TooManyRequestsError(I18n.tooManyRequests)),
  });
}

export function createApiRateLimiter() {
  return createRateLimiter(config.rateLimit.api);
}

export function createAuthRateLimiter() {
  return createRateLimiter(config.rateLimit.auth);
}
