import type { Message as PrismaMessage } from "@/generated/prisma/client";
import { MessageRole, type Message } from "../domain";

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

  if (record.mediaId !== null) {
    return {
      ...base,
      content: record.content,
      mediaId: record.mediaId,
    };
  }

  if (record.content !== null) {
    return {
      ...base,
      content: record.content,
      mediaId: null,
    };
  }

  return invalidRecord();
}
