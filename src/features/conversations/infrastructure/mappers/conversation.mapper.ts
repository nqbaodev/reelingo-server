import type { Conversation as PrismaConversation } from "@/generated/prisma/client";
import type { Conversation } from "../../domain";

export function toEntity(record: PrismaConversation): Conversation {
  return {
    id: record.id,
    projectId: record.projectId,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
