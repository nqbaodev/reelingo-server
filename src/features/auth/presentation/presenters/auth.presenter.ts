import type { TokenPair } from "@/services/jwt";

export function toAuthTokensResponse(tokens: TokenPair) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}
