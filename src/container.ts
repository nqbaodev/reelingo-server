import type { RequestHandler, Router } from "express";
import { config } from "@/config";
import type { MediaGenerator, TextGenerator } from "@/application/interfaces/ai/ai.types";
import type { ChatClient } from "@/application/interfaces/ai/chat.client";
import {
  ConfiguredMediaGenerationRouteResolver,
  type MediaGenerationRouteResolver,
} from "@/application/policies/ai";
import { ListAdminLogsUseCase } from "@/application/use-cases/admin-logs";
import { ProcessNextAiGenerationUseCase } from "@/application/use-cases/ai";
import {
  DeleteUnusedAssetsUseCase,
  GetAssetContentUseCase,
  ListAssetsUseCase,
  UploadImageUseCase,
} from "@/application/use-cases/assets";
import {
  LoginWithGoogleUseCase,
  LogoutUseCase,
  RefreshSessionUseCase,
} from "@/application/use-cases/auth";
import {
  ListConversationsUseCase,
  UpdateConversationNameUseCase,
} from "@/application/use-cases/conversations";
import {
  CreateMessageUseCase,
  GenerateAssistantResponseUseCase,
  GetMessageResponseUseCase,
  ListMessagesUseCase,
  SendMessageUseCase,
} from "@/application/use-cases/messages";
import {
  CreateProjectUseCase,
  GetProjectUseCase,
  ListProjectsUseCase,
  UpdateProjectTitleUseCase,
} from "@/application/use-cases/projects";
import { UpdateProfileUseCase } from "@/application/use-cases/users";
import { AiProviderId, CHAT_RUN_LEASE_BUFFER_MS } from "@/domain";
import { AssetKind } from "@/domain";
import type { PrismaClient } from "@/generated/prisma/client";
import { GeminiProvider } from "@/infrastructure/clients/ai";
import { GoogleIdTokenVerifier } from "@/infrastructure/clients/google-identity/google-id-token.verifier";
import { prisma } from "@/infrastructure/database/prisma";
import { logger, recentLogStore } from "@/infrastructure/logging";
import { PrismaReadiness } from "@/infrastructure/readiness/health/prisma-readiness";
import { AiGenerationPrismaRepository } from "@/infrastructure/repositories/ai";
import { AssetPrismaRepository } from "@/infrastructure/repositories/assets";
import { ConversationPrismaRepository } from "@/infrastructure/repositories/conversations";
import { MessagePrismaRepository } from "@/infrastructure/repositories/messages";
import { ProjectPrismaRepository } from "@/infrastructure/repositories/projects";
import { UserPrismaRepository } from "@/infrastructure/repositories/users";
import { JwtService } from "@/infrastructure/security/jwt/jwt.service";
import { AiProviderRegistry } from "@/infrastructure/services/ai/ai-provider.registry";
import { AiService } from "@/infrastructure/services/ai/ai.service";
import { LocalAssetStorage } from "@/infrastructure/storage/assets";
import { TokenRevocationPrismaStore } from "@/infrastructure/stores/auth";
import { AiGenerationWorker } from "@/infrastructure/workers/ai";
import { AdminLogController } from "@/presentation/controllers/admin-logs";
import { AssetController } from "@/presentation/controllers/assets";
import { AuthController } from "@/presentation/controllers/auth";
import { ConversationController } from "@/presentation/controllers/conversations";
import { MessageController } from "@/presentation/controllers/messages";
import { ProjectController } from "@/presentation/controllers/projects";
import { UserController } from "@/presentation/controllers/users";
import { createDocsRouter } from "@/presentation/http/docs.routes";
import { openApiDocument } from "@/presentation/http/openapi";
import { createAuthenticate } from "@/presentation/middlewares/auth";
import { createAuthRateLimiter, createHttpLogger } from "@/presentation/middlewares";
import { adminOpenApiDocument } from "@/presentation/openapi/admin-openapi";
import { createAdminLogRouter } from "@/presentation/routes/admin-logs";
import { createAssetRouter } from "@/presentation/routes/assets";
import {
  createProtectedAuthRouter,
  createPublicAuthRouter,
} from "@/presentation/routes/auth";
import { createConversationRouter } from "@/presentation/routes/conversations";
import { createHealthRouter } from "@/presentation/routes/health";
import { createMessageRouter } from "@/presentation/routes/messages";
import { createProjectRouter } from "@/presentation/routes/projects";
import { createUserRouter } from "@/presentation/routes/users";

export interface CreateContainerOptions {
  chatClient?: ChatClient;
  textGenerator?: TextGenerator;
  mediaGenerator?: MediaGenerator;
  mediaRouteResolver?: MediaGenerationRouteResolver;
  database?: PrismaClient;
}

export interface WorkerLifecycle {
  start(): void;
  stop(): Promise<void>;
}

export interface ApplicationContainer {
  httpLogger: RequestHandler;
  healthRouter: Router;
  docsRouter: Router;
  adminLogsRouter: Router | null;
  publicAuthRouter: Router;
  authenticate: RequestHandler;
  protectedAuthRouter: Router;
  usersRouter: Router;
  projectsRouter: Router;
  conversationsRouter: Router;
  assetsRouter: Router;
  messagesRouter: Router;
  generationWorker: WorkerLifecycle;
}

export function createContainer(
  options: CreateContainerOptions = {},
): ApplicationContainer {
  const database = options.database ?? prisma;

  const users = new UserPrismaRepository(database);
  const projects = new ProjectPrismaRepository(database);
  const conversations = new ConversationPrismaRepository(database);
  const messages = new MessagePrismaRepository(database);
  const assets = new AssetPrismaRepository(database);
  const generations = new AiGenerationPrismaRepository(database);
  const revocations = new TokenRevocationPrismaStore(database);
  const storage = new LocalAssetStorage(config.storage.root);

  const jwt = new JwtService(config.auth.jwt);
  const googleIdentity = new GoogleIdTokenVerifier(config.auth.google.clientId);
  const geminiProvider = new GeminiProvider({
    apiKey: config.ai.gemini.apiKey,
    textModel: config.ai.gemini.model,
    requestTimeoutMs: config.ai.gemini.timeoutMs,
    generationTimeoutMs: config.ai.generation.timeoutMs,
    videoPollIntervalMs: config.ai.generation.videoPollIntervalMs,
  });
  const providers = new AiProviderRegistry()
    .registerText(geminiProvider)
    .registerImage(geminiProvider)
    .registerVideo(geminiProvider);
  const aiService = new AiService(providers, AiProviderId.GEMINI);
  const chatClient = options.chatClient ?? geminiProvider;
  const mediaGenerator = options.mediaGenerator ?? aiService;
  const textGenerator = options.textGenerator ?? aiService;
  const mediaRouteResolver =
    options.mediaRouteResolver ??
    new ConfiguredMediaGenerationRouteResolver({
      [AssetKind.IMAGE]: {
        providerId: AiProviderId.GEMINI,
        model: config.ai.generation.imageModel,
      },
      [AssetKind.VIDEO]: {
        providerId: AiProviderId.GEMINI,
        model: config.ai.generation.videoModel,
      },
    });

  const authController = new AuthController({
    googleIdTokenVerifier: googleIdentity,
    loginWithGoogle: new LoginWithGoogleUseCase(users, jwt),
    refreshSession: new RefreshSessionUseCase(users, jwt, revocations),
    logout: new LogoutUseCase(revocations),
  });
  const usersController = new UserController({
    updateProfile: new UpdateProfileUseCase(users),
  });
  const projectsController = new ProjectController({
    createProject: new CreateProjectUseCase(projects),
    getProject: new GetProjectUseCase(projects),
    listProjects: new ListProjectsUseCase(projects),
    updateProjectTitle: new UpdateProjectTitleUseCase(projects),
  });
  const conversationsController = new ConversationController({
    listConversations: new ListConversationsUseCase(conversations),
    updateConversationName: new UpdateConversationNameUseCase(conversations),
  });
  const assetsController = new AssetController({
    deleteUnusedAssets: new DeleteUnusedAssetsUseCase(assets, storage),
    getAssetContent: new GetAssetContentUseCase(assets, storage),
    listAssets: new ListAssetsUseCase(assets),
    uploadImage: new UploadImageUseCase(assets, storage),
  });
  const createMessage = new CreateMessageUseCase(messages);
  const generateAssistantResponse = new GenerateAssistantResponseUseCase(
    messages,
    chatClient,
    mediaRouteResolver,
    config.ai.gemini.timeoutMs + CHAT_RUN_LEASE_BUFFER_MS,
  );
  const messagesController = new MessageController({
    getMessageResponse: new GetMessageResponseUseCase(messages),
    listMessages: new ListMessagesUseCase(messages),
    sendMessage: new SendMessageUseCase(createMessage, generateAssistantResponse),
  });

  const processNextGeneration = new ProcessNextAiGenerationUseCase(
    generations,
    mediaGenerator,
    textGenerator,
    storage,
    config.ai.generation.leaseMs,
  );
  const generationWorker = new AiGenerationWorker(
    processNextGeneration,
    config.ai.generation.pollIntervalMs,
    logger,
  );

  const adminCredentials = config.logger.admin.credentials;
  const adminLogsRouter = adminCredentials
    ? createAdminLogRouter(
        new AdminLogController(new ListAdminLogsUseCase(recentLogStore)),
        adminCredentials,
        adminOpenApiDocument,
      )
    : null;

  return {
    httpLogger: createHttpLogger(logger),
    healthRouter: createHealthRouter(new PrismaReadiness(database)),
    docsRouter: createDocsRouter(openApiDocument),
    adminLogsRouter,
    publicAuthRouter: createPublicAuthRouter(authController, createAuthRateLimiter()),
    authenticate: createAuthenticate({ users, jwt, revocations }),
    protectedAuthRouter: createProtectedAuthRouter(authController),
    usersRouter: createUserRouter(usersController),
    projectsRouter: createProjectRouter(projectsController),
    conversationsRouter: createConversationRouter(conversationsController),
    assetsRouter: createAssetRouter(assetsController),
    messagesRouter: createMessageRouter(messagesController),
    generationWorker,
  };
}
