import compression from "compression";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { config } from "@/config";
import { adminOpenApiDocument } from "@/admin-openapi";
import { createAdminLogsModule } from "@/features/admin-logs/admin-logs.module";
import { createAiModule } from "@/features/ai/ai.module";
import type {
  AiGenerationWorker,
  ChatClient,
  MediaGenerator,
  TextGenerator,
} from "@/features/ai/infrastructure";
import type { MediaGenerationRouteResolver } from "@/features/ai/application";
import { createAuthModule } from "@/features/auth/auth.module";
import { createConversationsModule } from "@/features/conversations/conversations.module";
import { createHealthModule } from "@/features/health/health.module";
import { createAssetsModule } from "@/features/assets/assets.module";
import { createMessagesModule } from "@/features/messages/messages.module";
import { createProjectsModule } from "@/features/projects/projects.module";
import { createUsersModule } from "@/features/users/users.module";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/shared/database";
import { httpLogger, recentLogStore } from "@/shared/logger";
import {
  createApiRateLimiter,
  errorHandler,
  notFoundHandler,
} from "@/shared/middlewares";
import { languageMiddleware } from "@/shared/middlewares/language";
import { createDocsRouter } from "@/shared/http/docs.routes";
import { endpoints } from "@/shared/http/endpoints";
import { openApiDocument } from "@/openapi";

interface CreateAppOptions {
  chatClient?: ChatClient;
  textGenerator?: TextGenerator;
  mediaGenerator?: MediaGenerator;
  mediaRouteResolver?: MediaGenerationRouteResolver;
  database?: PrismaClient;
}

export interface ApplicationRuntime {
  app: Express;
  generationWorker: AiGenerationWorker;
}

export function createApplication(options: CreateAppOptions = {}): ApplicationRuntime {
  const app = express();

  // Global middleware
  app.use(httpLogger);
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
  const assetsModule = createAssetsModule(database);
  const aiModule = createAiModule(database, assetsModule.storage, options);
  const messagesModule = createMessagesModule(
    database,
    aiModule.chatClient,
    aiModule.mediaRouteResolver,
  );
  const projectsModule = createProjectsModule(database);
  const usersModule = createUsersModule(database);
  const adminLoggerCredentials = config.logger.admin.credentials;
  const adminLogsModule = adminLoggerCredentials
    ? createAdminLogsModule(recentLogStore, adminLoggerCredentials, adminOpenApiDocument)
    : null;

  // Public routes
  app.use(healthModule.router);
  app.use(createDocsRouter(openApiDocument));
  if (adminLogsModule) app.use(adminLogsModule.router);

  // API routes
  app.use(
    endpoints.apiPrefix,
    createApiRateLimiter(),
    authModule.publicRouter,
    authModule.authenticate,
    authModule.protectedRouter,
    usersModule.router,
    projectsModule.router,
    conversationsModule.router,
    assetsModule.router,
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
