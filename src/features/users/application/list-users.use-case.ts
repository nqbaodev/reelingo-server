import type { PaginatedResult, PaginationParams } from "@/core/types/pagination";
import type { User } from "../domain";
import type { UserRepository } from "../infrastructure";

export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(pagination: PaginationParams): Promise<PaginatedResult<User>> {
    return this.users.list(pagination);
  }
}
