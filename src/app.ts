import compression from "compression";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { config } from "@/config";
import { createAiModule } from "@/features/ai/ai.module";
import type { GenerativeAiClient } from "@/features/ai/infrastructure";
import { createAuthModule } from "@/features/auth/auth.module";
import { createHealthModule } from "@/features/health/health.module";
import type { PrismaClient } from "@/generated/prisma/client";
import { createUsersModule } from "@/features/users/users.module";
import { prisma } from "@/shared/database";
import { logger } from "@/shared/logger";
import {
  createApiRateLimiter,
  errorHandler,
  notFoundHandler,
} from "@/shared/middlewares";
import { assignRequestId } from "@/shared/middlewares/request-id";
import { languageMiddleware } from "@/shared/middlewares/language";
import { createDocsRouter } from "@/shared/http/docs.routes";
import { openApiDocument } from "@/openapi";

interface CreateAppOptions {
  aiClient?: GenerativeAiClient;
  database?: PrismaClient;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  app.use(pinoHttp({ logger, genReqId: assignRequestId }));
  app.use(helmet());
  app.use(
    cors({
      origin: config.server.corsOrigin,
      exposedHeaders: [config.http.headers.requestId, config.i18n.headers.contentLanguage],
    }),
  );
  app.use(compression());
  app.use(languageMiddleware);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const database = options.database ?? prisma;
  const authModule = createAuthModule(database);
  const healthModule = createHealthModule(database);
  const aiModule = createAiModule(options.aiClient);
  const usersModule = createUsersModule(database);

  app.use(healthModule.router);
  app.use(createDocsRouter(openApiDocument));
  app.use("/api/v1", createApiRateLimiter(), authModule.router);
  app.use("/api/v1", authModule.authenticate, usersModule.router, aiModule.router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
