import type { AuthTokens } from "../domain";

export function toAuthTokensResponse(tokens: AuthTokens) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}
