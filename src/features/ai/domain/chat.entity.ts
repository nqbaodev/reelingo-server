import { MediaType } from "@/features/media/domain";
import {
  parseAiGenerationConfig,
  type AiGenerationConfig,
} from "./ai-generation.entity";

export const CHAT_RUN_LEASE_BUFFER_MS = 30_000;

export const ChatRunStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ChatRunStatus =
  (typeof ChatRunStatus)[keyof typeof ChatRunStatus];

export interface ChatContext {
  intentHint: MediaType | null;
  generationSettings: Partial<Record<MediaType, AiGenerationConfig>>;
}

export interface MessageChatRun {
  id: string;
  status: ChatRunStatus;
  resultMessageId: string | null;
}

export interface ChatInput {
  content: string;
  intentHint: MediaType | null;
}

export const ChatResultType = {
  REPLY: "reply",
  GENERATION: "generation",
} as const;

export type ChatResultType =
  (typeof ChatResultType)[keyof typeof ChatResultType];

export type ChatResult =
  | { type: typeof ChatResultType.REPLY; content: string }
  | {
      type: typeof ChatResultType.GENERATION;
      mediaType: MediaType;
      content: string;
    };

export function parseChatContext(value: unknown): ChatContext {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Chat context snapshot must be an object");
  }

  const context = value as Record<string, unknown>;
  const intentHint = context.intentHint;
  if (
    intentHint !== null &&
    intentHint !== MediaType.IMAGE &&
    intentHint !== MediaType.VIDEO
  ) {
    throw new Error("Chat context snapshot has an invalid intent hint");
  }

  const rawSettings = context.generationSettings;
  if (
    typeof rawSettings !== "object" ||
    rawSettings === null ||
    Array.isArray(rawSettings)
  ) {
    throw new Error("Chat context snapshot has invalid generation settings");
  }

  const settings = rawSettings as Record<string, unknown>;
  return {
    intentHint,
    generationSettings: {
      ...(settings[MediaType.IMAGE] === undefined
        ? {}
        : {
            [MediaType.IMAGE]: parseAiGenerationConfig(
              settings[MediaType.IMAGE],
            ),
          }),
      ...(settings[MediaType.VIDEO] === undefined
        ? {}
        : {
            [MediaType.VIDEO]: parseAiGenerationConfig(
              settings[MediaType.VIDEO],
            ),
          }),
    },
  };
}
