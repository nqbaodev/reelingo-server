import type { User as PrismaUser } from "@/generated/prisma/client";
import type { User } from "../../domain";

export function toEntity(record: PrismaUser): User {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    googleId: record.googleId,
    avatarUrl: record.avatarUrl,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
