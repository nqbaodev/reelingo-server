import pino from "pino";
import { config } from "@/config";

export const logger = pino({
  level: config.logger.level,
  transport: config.isDevelopment
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});
