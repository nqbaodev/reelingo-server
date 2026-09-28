import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { fromDateOnlyString } from "@/core/utils";
import { isPrismaRecordNotFound } from "@/shared/database/prisma-error";
import type { NewUser, ProfileUpdate, User } from "../../domain";
import type { UserRepository } from "./user.repository";
import { toEntity } from "../mappers/user.mapper";

const userRelations = { profile: true } as const satisfies Prisma.UserInclude;

function toProfileUpdate(data: ProfileUpdate): Prisma.UserProfileUpdateInput {
  return {
    ...data,
    birthDate: data.birthDate === null ? null : fromDateOnlyString(data.birthDate),
  };
}

export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id },
      include: userRelations,
    });
    return record ? toEntity(record) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { googleId },
      include: userRelations,
    });
    return record ? toEntity(record) : null;
  }

  async create(data: NewUser): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        email: data.email,
        googleId: data.googleId,
        profile: {
          create: {
            displayName: data.displayName,
          },
        },
      },
      include: userRelations,
    });
    return toEntity(record);
  }

  async updateProfile(id: number, data: ProfileUpdate): Promise<User | null> {
    try {
      const record = await this.prisma.user.update({
        where: { id },
        data: { profile: { update: toProfileUpdate(data) } },
        include: userRelations,
      });
      return toEntity(record);
    } catch (err) {
      if (isPrismaRecordNotFound(err)) {
        return null;
      }
      throw err;
    }
  }
}
