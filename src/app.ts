import compression from "compression";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { config } from "@/config";
import { createAiModule } from "@/features/ai/ai.module";
import type {
  AiGenerationWorker,
  ChatClient,
  MediaGenerationClient,
} from "@/features/ai/infrastructure";
import { createAuthModule } from "@/features/auth/auth.module";
import { createConversationsModule } from "@/features/conversations/conversations.module";
import { createHealthModule } from "@/features/health/health.module";
import { createMediaModule } from "@/features/media/media.module";
import { createMessagesModule } from "@/features/messages/messages.module";
import { createUsersModule } from "@/features/users/users.module";
import type { PrismaClient } from "@/generated/prisma/client";
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
import { endpoints } from "@/shared/http/endpoints";
import { openApiDocument } from "@/openapi";

interface CreateAppOptions {
  chatClient?: ChatClient;
  mediaGenerationClient?: MediaGenerationClient;
  database?: PrismaClient;
}

export interface ApplicationRuntime {
  app: Express;
  generationWorker: AiGenerationWorker;
}

export function createApplication(options: CreateAppOptions = {}): ApplicationRuntime {
  const app = express();

  // Global middleware
  app.use(pinoHttp({ logger, genReqId: assignRequestId }));
  app.use(helmet());
  app.use(
    cors({
      origin: config.server.corsOrigin,
      exposedHeaders: [
        config.http.headers.requestId,
        config.i18n.headers.contentLanguage,
      ],
    }),
  );
  app.use(compression());
  app.use(languageMiddleware);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const database = options.database ?? prisma;
  const authModule = createAuthModule(database);
  const healthModule = createHealthModule(database);
  const conversationsModule = createConversationsModule(database);
  const mediaModule = createMediaModule(database);
  const aiModule = createAiModule(
    database,
    mediaModule.storage,
    options.chatClient,
    options.mediaGenerationClient,
  );
  const messagesModule = createMessagesModule(database, aiModule.client, aiModule.events);
  const usersModule = createUsersModule(database);

  // Public routes
  app.use(healthModule.router);
  app.use(createDocsRouter(openApiDocument));

  // API routes
  app.use(
    endpoints.apiPrefix,
    createApiRateLimiter(),
    authModule.publicRouter,
    authModule.authenticate,
    authModule.protectedRouter,
    usersModule.router,
    conversationsModule.router,
    mediaModule.router,
    messagesModule.router,
  );

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, generationWorker: aiModule.worker };
}

export function createApp(options: CreateAppOptions = {}): Express {
  return createApplication(options).app;
}
