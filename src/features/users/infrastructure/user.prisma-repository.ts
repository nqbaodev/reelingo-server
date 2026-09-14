import type { PrismaClient } from "@/generated/prisma/client";
import type { NewUser, ProfileUpdate, User } from "../domain";
import type { UserRepository } from "./user.repository";
import { toEntity } from "./user.mapper";

export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? toEntity(record) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { googleId } });
    return record ? toEntity(record) : null;
  }

  async create(data: NewUser): Promise<User> {
    const record = await this.prisma.user.create({ data });
    return toEntity(record);
  }

  async updateProfile(id: number, data: ProfileUpdate): Promise<User> {
    const record = await this.prisma.user.update({ where: { id }, data });
    return toEntity(record);
  }
}
