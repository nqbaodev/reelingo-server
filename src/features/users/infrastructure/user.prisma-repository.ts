import type { PrismaClient, User as PrismaUser } from "@/generated/prisma/client";
import { buildPaginatedResult, type PaginatedResult, type PaginationParams } from "@/core/types/pagination";
import type { NewUser, User, UserUpdate } from "../domain";
import type { UserRepository } from "./user.repository";

function toDomain(record: PrismaUser): User {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? toDomain(record) : null;
  }

  async list(pagination: PaginationParams): Promise<PaginatedResult<User>> {
    const { page, pageSize } = pagination;
    const [records, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count(),
    ]);

    return buildPaginatedResult(records.map(toDomain), total, pagination);
  }

  async create(data: NewUser): Promise<User> {
    const record = await this.prisma.user.create({ data });
    return toDomain(record);
  }

  async update(id: string, data: UserUpdate): Promise<User> {
    const record = await this.prisma.user.update({ where: { id }, data });
    return toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
