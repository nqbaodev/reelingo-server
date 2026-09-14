import type { User } from "@/features/users/domain";
import type { TokenPair } from "../domain";

export function toAuthResponse(user: User, tokens: TokenPair) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  };
}

export function toTokenPairResponse(tokens: TokenPair) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}
