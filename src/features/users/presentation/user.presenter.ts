import type { User } from "../domain";

export interface CurrentUserResponse {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export function toCurrentUserResponse(user: User): CurrentUserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };
}
