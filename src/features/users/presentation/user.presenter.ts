import type { PaginatedResult } from "@/core/types/pagination";
import type { User } from "../domain";

/**
 * Shapes the HTTP response for a user. Kept separate from the domain
 * entity so internal fields can be added later (e.g. passwordHash)
 * without accidentally leaking them through the API.
 */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toUserListResponse(result: PaginatedResult<User>) {
  return {
    ...result,
    items: result.items.map(toUserResponse),
  };
}
