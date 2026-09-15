import type { Message as PrismaMessage } from "@/generated/prisma/client";
import { MediaType, MessageRole, type Message } from "../domain";

function invalidRecord(): never {
  throw new Error("Message record has an invalid content shape");
}

function toMessageRole(role: PrismaMessage["role"]): Message["role"] {
  switch (role) {
    case MessageRole.USER:
      return MessageRole.USER;
    case MessageRole.ASSISTANT:
      return MessageRole.ASSISTANT;
  }
}

export function toEntity(record: PrismaMessage): Message {
  const base = {
    id: record.id,
    conversationId: record.conversationId,
    role: toMessageRole(record.role),
    createdAt: record.createdAt,
  };

  switch (record.mediaType) {
    case null:
      if (record.content === null) {
        return invalidRecord();
      }
      return {
        ...base,
        content: record.content,
        media: null,
      };

    case MediaType.IMAGE:
      if (record.mediaUrl === null || record.mimeType === null) {
        return invalidRecord();
      }
      return {
        ...base,
        content: record.content,
        media: {
          type: MediaType.IMAGE,
          url: record.mediaUrl,
          mimeType: record.mimeType,
        },
      };

    case MediaType.VIDEO:
      if (
        record.mediaUrl === null ||
        record.mimeType === null ||
        record.duration === null
      ) {
        return invalidRecord();
      }
      return {
        ...base,
        content: record.content,
        media: {
          type: MediaType.VIDEO,
          url: record.mediaUrl,
          thumbnailUrl: record.thumbnailUrl,
          mimeType: record.mimeType,
          duration: record.duration,
        },
      };
  }
}
