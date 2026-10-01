import { config } from "@/config";
import type { AssetStorage } from "@/features/assets/infrastructure";
import { AssetKind } from "@/features/assets/domain";
import type { PrismaClient } from "@/generated/prisma/client";
import { logger } from "@/shared/logger";
import {
  ConfiguredMediaGenerationRouteResolver,
  ProcessNextAiGenerationUseCase,
  type MediaGenerationRouteResolver,
} from "./application";
import { AiProviderId } from "./domain";
import {
  AiGenerationPrismaRepository,
  AiGenerationWorker,
  GeminiProvider,
  RoutedMediaGenerator,
  type ChatClient,
  type MediaGenerator,
  type TextGenerator,
} from "./infrastructure";

interface CreateAiModuleOptions {
  chatClient?: ChatClient;
  textGenerator?: TextGenerator;
  mediaGenerator?: MediaGenerator;
  mediaRouteResolver?: MediaGenerationRouteResolver;
}

export function createAiModule(
  prisma: PrismaClient,
  storage: AssetStorage,
  options: CreateAiModuleOptions = {},
) {
  const geminiProvider = new GeminiProvider({
    apiKey: config.ai.gemini.apiKey,
    textModel: config.ai.gemini.model,
    requestTimeoutMs: config.ai.gemini.timeoutMs,
    generationTimeoutMs: config.ai.generation.timeoutMs,
    videoPollIntervalMs: config.ai.generation.videoPollIntervalMs,
  });
  const chatClient = options.chatClient ?? geminiProvider;
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
  const mediaGenerator =
    options.mediaGenerator ??
    new RoutedMediaGenerator(new Map([[geminiProvider.id, geminiProvider]]));
  const textGenerator = options.textGenerator ?? geminiProvider;
  const processNextGeneration = new ProcessNextAiGenerationUseCase(
    new AiGenerationPrismaRepository(prisma),
    mediaGenerator,
    textGenerator,
    storage,
    config.ai.generation.leaseMs,
  );

  return {
    chatClient,
    mediaRouteResolver,
    worker: new AiGenerationWorker(
      processNextGeneration,
      config.ai.generation.pollIntervalMs,
      logger,
    ),
  };
}
