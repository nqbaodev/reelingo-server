import { rateLimit } from "express-rate-limit";
import { config } from "@/config";

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.api.windowMs,
  limit: config.rateLimit.api.limit,
  standardHeaders: true,
  legacyHeaders: false,
});
