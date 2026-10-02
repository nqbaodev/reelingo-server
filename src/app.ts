import compression from "compression";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { config } from "@/config";
import {
  createContainer,
  type CreateContainerOptions,
  type WorkerLifecycle,
} from "@/container";
import { endpoints } from "@/presentation/http/endpoints";
import {
  createApiRateLimiter,
  errorHandler,
  notFoundHandler,
} from "@/presentation/middlewares";
import { languageMiddleware } from "@/presentation/middlewares/language";

export interface ApplicationRuntime {
  app: Express;
  generationWorker: WorkerLifecycle;
}

export function createApplication(
  options: CreateContainerOptions = {},
): ApplicationRuntime {
  const app = express();
  const container = createContainer(options);

  app.use(container.httpLogger);
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

  app.use(container.healthRouter);
  app.use(container.docsRouter);
  if (container.adminLogsRouter) app.use(container.adminLogsRouter);

  app.use(
    endpoints.apiPrefix,
    createApiRateLimiter(),
    container.publicAuthRouter,
    container.authenticate,
    container.protectedAuthRouter,
    container.usersRouter,
    container.projectsRouter,
    container.conversationsRouter,
    container.assetsRouter,
    container.messagesRouter,
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, generationWorker: container.generationWorker };
}

export function createApp(options: CreateContainerOptions = {}): Express {
  return createApplication(options).app;
}
