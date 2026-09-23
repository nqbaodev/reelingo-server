import { createApplication } from "@/app";
import { config } from "@/config";
import { prisma } from "@/shared/database";
import { logger } from "@/shared/logger";

const { app, generationWorker } = createApplication();

const server = app.listen(config.server.port, () => {
  logger.info(`Server listening on port ${config.server.port} (${config.nodeEnv})`);
  if (config.ai.generation.workerEnabled) {
    generationWorker.start();
    logger.info("AI generation worker started");
  }
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}, shutting down gracefully`);

  const workerStopped = generationWorker.stop().catch((err: unknown) => {
    logger.error({ err }, "Failed to stop AI generation worker cleanly");
  });
  const forceCloseTimer = setTimeout(() => {
    logger.warn("Forcing remaining HTTP connections to close");
    server.closeAllConnections();
  }, 10_000);
  forceCloseTimer.unref();

  server.close(async () => {
    clearTimeout(forceCloseTimer);
    await workerStopped;
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
