import type { TokenPair } from "@/services/jwt";
import type { AuthTokensResponseDto } from "../dtos/auth.dto";

export function toAuthTokensResponse(tokens: TokenPair): AuthTokensResponseDto {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}
