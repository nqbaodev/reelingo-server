import { randomUUID } from "node:crypto";
import { buildPaginatedResult, type PaginatedResult, type PaginationParams } from "@/core/types/pagination";
import type { NewUser, User, UserUpdate } from "@/features/users/domain";
import type { UserRepository } from "@/features/users/infrastructure";

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return [...this.users.values()].find((u) => u.email === email) ?? null;
  }

  async list(pagination: PaginationParams): Promise<PaginatedResult<User>> {
    const all = [...this.users.values()];
    const start = (pagination.page - 1) * pagination.pageSize;
    const page = all.slice(start, start + pagination.pageSize);
    return buildPaginatedResult(page, all.length, pagination);
  }

  async create(data: NewUser): Promise<User> {
    const now = new Date();
    const user: User = { id: randomUUID(), ...data, createdAt: now, updatedAt: now };
    this.users.set(user.id, user);
    return user;
  }

  async update(id: string, data: UserUpdate): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error("not found");
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }
}
