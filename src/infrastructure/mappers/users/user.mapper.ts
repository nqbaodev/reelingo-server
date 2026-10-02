import { toDateOnlyString } from "@/utils";
import type {
  User as PrismaUser,
  UserProfile as PrismaUserProfile,
} from "@/generated/prisma/client";
import type { User } from "@/domain";

type UserRecord = PrismaUser & { profile: PrismaUserProfile | null };

export function toEntity(record: UserRecord): User {
  if (!record.profile) {
    throw new Error(`User ${record.id} is missing its profile`);
  }

  return {
    id: record.id,
    email: record.email,
    googleId: record.googleId,
    displayName: record.profile.displayName,
    avatarUrl: record.profile.avatarUrl,
    countryCode: record.profile.countryCode,
    phoneNumber: record.profile.phoneNumber,
    birthDate: record.profile.birthDate
      ? toDateOnlyString(record.profile.birthDate)
      : null,
    createdAt: record.createdAt,
    updatedAt: record.profile.updatedAt,
  };
}
