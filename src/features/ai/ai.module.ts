import { config } from "@/config";
import type { MediaStorage } from "@/features/media/infrastructure";
import type { PrismaClient } from "@/generated/prisma/client";
import { logger } from "@/shared/logger";
import { ProcessAiGenerationUseCase } from "./application";
import {
  AiGenerationPrismaRepository,
  AiGenerationWorker,
  GeminiClient,
  GeminiMediaGenerationClient,
  InMemoryAiGenerationEvents,
  type ChatClient,
  type MediaGenerationClient,
} from "./infrastructure";

export function createAiModule(
  prisma: PrismaClient,
  storage: MediaStorage,
  chatClient?: ChatClient,
  mediaGenerationClient?: MediaGenerationClient,
) {
  const client = chatClient ?? new GeminiClient(config.ai.gemini);
  const generationClient =
    mediaGenerationClient ??
    new GeminiMediaGenerationClient({
      apiKey: config.ai.gemini.apiKey,
      chatModel: config.ai.gemini.model,
      imageModel: config.ai.generation.imageModel,
      videoModel: config.ai.generation.videoModel,
      requestTimeoutMs: config.ai.gemini.timeoutMs,
      generationTimeoutMs: config.ai.generation.timeoutMs,
      videoPollIntervalMs: config.ai.generation.videoPollIntervalMs,
    });
  const events = new InMemoryAiGenerationEvents();
  const processGeneration = new ProcessAiGenerationUseCase(
    new AiGenerationPrismaRepository(prisma),
    generationClient,
    storage,
    events,
    config.ai.generation.leaseMs,
  );

  return {
    client,
    events,
    worker: new AiGenerationWorker(
      processGeneration,
      config.ai.generation.pollIntervalMs,
      logger,
    ),
  };
}
