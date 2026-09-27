import type {
  AiGeneration as PrismaAiGeneration,
  ChatRun as PrismaChatRun,
  Message as PrismaMessage,
  MessageMedia,
} from "@/generated/prisma/client";
import {
  AiGenerationStatus,
  ChatRunStatus,
  parseAiGenerationConfig,
  type MessageChatRun,
} from "@/features/ai/domain";
import { MediaType } from "@/features/media/domain";
import {
  MessageRole,
  type Message,
} from "../../domain";

export type MessageRecord = PrismaMessage & {
  mediaLinks: MessageMedia[];
  triggeredGeneration: PrismaAiGeneration | null;
  generationResult: PrismaAiGeneration | null;
  triggeredChatRun: PrismaChatRun | null;
  chatRunResult: PrismaChatRun | null;
};

function toMessageRole(role: PrismaMessage["role"]): Message["role"] {
  switch (role) {
    case MessageRole.USER:
      return MessageRole.USER;
    case MessageRole.ASSISTANT:
      return MessageRole.ASSISTANT;
  }
}

function toGenerationType(type: PrismaAiGeneration["type"]): MediaType {
  switch (type) {
    case MediaType.IMAGE:
      return MediaType.IMAGE;
    case MediaType.VIDEO:
      return MediaType.VIDEO;
  }
}

function toGenerationStatus(
  status: PrismaAiGeneration["status"],
): AiGenerationStatus {
  switch (status) {
    case AiGenerationStatus.PENDING:
      return AiGenerationStatus.PENDING;
    case AiGenerationStatus.PROCESSING:
      return AiGenerationStatus.PROCESSING;
    case AiGenerationStatus.COMPLETED:
      return AiGenerationStatus.COMPLETED;
    case AiGenerationStatus.FAILED:
      return AiGenerationStatus.FAILED;
  }
}

function toChatRunStatus(status: PrismaChatRun["status"]): ChatRunStatus {
  switch (status) {
    case ChatRunStatus.PENDING:
      return ChatRunStatus.PENDING;
    case ChatRunStatus.PROCESSING:
      return ChatRunStatus.PROCESSING;
    case ChatRunStatus.COMPLETED:
      return ChatRunStatus.COMPLETED;
    case ChatRunStatus.FAILED:
      return ChatRunStatus.FAILED;
  }
}

export function toMessageChatRun(
  chatRun: Pick<PrismaChatRun, "id" | "status" | "resultMessageId">,
): MessageChatRun {
  return {
    id: chatRun.id,
    status: toChatRunStatus(chatRun.status),
    resultMessageId: chatRun.resultMessageId,
  };
}

export function toEntity(record: MessageRecord): Message {
  const generation = record.triggeredGeneration ?? record.generationResult;
  const chatRun = record.triggeredChatRun ?? record.chatRunResult;

  return {
    id: record.id,
    conversationId: record.conversationId,
    role: toMessageRole(record.role),
    content: record.content,
    mediaIds: record.mediaLinks.map(({ mediaId }) => mediaId),
    generation: generation
      ? {
          id: generation.id,
          triggerMessageId: generation.triggerMessageId,
          type: toGenerationType(generation.type),
          status: toGenerationStatus(generation.status),
          config: parseAiGenerationConfig(generation.configSnapshot),
          resultMessageId: generation.resultMessageId,
        }
      : null,
    chatRun: chatRun ? toMessageChatRun(chatRun) : null,
    createdAt: record.createdAt,
  };
}
