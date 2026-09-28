export const ACCESS_TOKEN_TYPE = "access";
export const REFRESH_TOKEN_TYPE = "refresh";

export type TokenType = typeof ACCESS_TOKEN_TYPE | typeof REFRESH_TOKEN_TYPE;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * A session groups one access token with the refresh token that renews it.
 * Revoking `sessionId` therefore invalidates both at once, and no token may
 * outlive `sessionExpiresAt`.
 */
export interface TokenClaims {
  userId: number;
  email: string;
  tokenId: string;
  tokenType: TokenType;
  sessionId: string;
  sessionExpiresAt: Date;
  expiresAt: Date;
}

export interface RawJwtClaims {
  sub: string;
  email: string;
  jti: string;
  typ: TokenType;
  sid: string;
  session_exp: number;
  exp: number;
}
