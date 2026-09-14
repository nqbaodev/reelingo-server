import { SECOND_MS } from "@/core/utils";
import type { TokenClaims, TokenType } from "../domain";

export interface RawClaims {
  sub: string;
  email: string;
  jti: string;
  typ: TokenType;
  sid: string;
  session_exp: number;
  exp: number;
}

export function toEntity(claims: RawClaims): TokenClaims {
  return {
    userId: Number(claims.sub),
    email: claims.email,
    tokenId: claims.jti,
    tokenType: claims.typ,
    sessionId: claims.sid,
    sessionExpiresAt: new Date(claims.session_exp * SECOND_MS),
    expiresAt: new Date(claims.exp * SECOND_MS),
  };
}
