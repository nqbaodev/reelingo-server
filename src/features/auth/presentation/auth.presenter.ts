import type { User } from "@/features/users/domain";
import type { TokenPair } from "../domain";

export function toAuthResponse(user: User, tokens: TokenPair) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: toCurrentUserResponse(user),
  };
}

export function toTokenPairResponse(tokens: TokenPair) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export function toCurrentUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };
}
