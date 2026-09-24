import type { Prisma } from "@/generated/prisma/client";
import { MessageRole, type Message } from "../domain";

type MessageRecord = Prisma.MessageGetPayload<{
  include: { media: { include: { media: true } } };
}>;

function toMessageRole(role: MessageRecord["role"]): Message["role"] {
  switch (role) {
    case MessageRole.USER:
      return MessageRole.USER;
    case MessageRole.ASSISTANT:
      return MessageRole.ASSISTANT;
  }
}

export function toEntity(record: MessageRecord): Message {
  if (record.content === null && record.media.length === 0) {
    throw new Error("Message record has an invalid content shape");
  }
  return {
    id: record.id,
    conversationId: record.conversationId,
    role: toMessageRole(record.role),
    content: record.content,
    media: record.media.map(({ media }) => ({ id: media.id })),
    createdAt: record.createdAt,
  };
}
