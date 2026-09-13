import compression from "compression";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { config } from "@/config";
import { createAuthModule } from "@/features/auth/auth.module";
import { healthModule } from "@/features/health/health.module";
import { createUsersModule } from "@/features/users/users.module";
import { prisma } from "@/shared/database";
import { logger } from "@/shared/logger";
import { apiRateLimiter, errorHandler, notFoundHandler } from "@/shared/middlewares";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.server.corsOrigin }));
  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger }));

  const authModule = createAuthModule(prisma);
  const usersModule = createUsersModule(prisma);

  app.use(healthModule.router);
  app.use("/api/v1", apiRateLimiter, authModule.router);
  app.use("/api/v1", apiRateLimiter, authModule.authenticate, usersModule.router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
