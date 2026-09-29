import type { Project as PrismaProject } from "@/generated/prisma/client";
import type { Project } from "../../domain";

export function toEntity(record: PrismaProject): Project {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
