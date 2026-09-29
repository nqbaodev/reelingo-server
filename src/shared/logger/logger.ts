import { createRequire } from "node:module";
import pino from "pino";
import { config } from "@/config";
import { RecentLogStore } from "./recent-log-store";

export const recentLogStore = new RecentLogStore(config.logger.admin.maxEntries);

function createConsoleStream(): pino.DestinationStream {
  if (!config.isDevelopment) return pino.destination(1);

  const loadModule = createRequire(__filename);
  const pinoPretty = loadModule("pino-pretty") as (options: {
    colorize: boolean;
  }) => pino.DestinationStream;
  return pinoPretty({ colorize: true });
}

const consoleStream = createConsoleStream();
const streams: pino.StreamEntry[] = [{ level: "trace", stream: consoleStream }];

if (config.logger.admin.credentials) {
  streams.push({ level: "trace", stream: recentLogStore });
}

export const logger = pino(
  {
    level: config.logger.level,
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie"],
      censor: "[Redacted]",
    },
  },
  pino.multistream(streams),
);
