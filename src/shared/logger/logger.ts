import pino from "pino";
import { config } from "@/config";

export const logger = pino({
  level: config.logger.level,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    censor: "[Redacted]",
  },
  transport: config.isDevelopment
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});
