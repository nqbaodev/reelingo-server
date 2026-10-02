import type { TokenPair } from "@/application/interfaces/security/token";
import type { AuthTokensResponseDto } from "@/presentation/dtos/auth/auth.dto";

export function toAuthTokensResponse(tokens: TokenPair): AuthTokensResponseDto {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}
