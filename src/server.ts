import { createApp } from "@/app";
import { config } from "@/config";
import { prisma } from "@/shared/database";
import { logger } from "@/shared/logger";

const app = createApp();

const server = app.listen(config.server.port, () => {
  logger.info(
    `Server listening on port ${config.server.port} (${config.nodeEnv})`,
  );
});

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
