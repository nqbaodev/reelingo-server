import type { PaginatedResult, PaginationParams } from "@/core/types/pagination";
import type { NewUser, User, UserUpdate } from "../domain/user.entity";

/**
 * Contract the application layer codes against; implemented by the
 * concrete adapter in this same layer (e.g. UserPrismaRepository).
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(pagination: PaginationParams): Promise<PaginatedResult<User>>;
  create(data: NewUser): Promise<User>;
  update(id: string, data: UserUpdate): Promise<User>;
  delete(id: string): Promise<void>;
}
