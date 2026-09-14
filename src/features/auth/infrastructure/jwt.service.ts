import { randomUUID } from "node:crypto";
import jwt, { type Algorithm, type JwtPayload } from "jsonwebtoken";
import { MINUTE_MS, toSeconds } from "@/core/utils";
import { MAX_USER_ID } from "@/features/users/domain";
import {
  ACCESS_TOKEN_TYPE,
  REFRESH_TOKEN_TYPE,
  type TokenClaims,
  type TokenPair,
  type TokenType,
} from "../domain";
import { toEntity, type RawClaims } from "./jwt.mapper";

interface JwtServiceOptions {
  algorithm: Algorithm;
  secret: string;
  issuer: string;
  audience: string;
  accessTtlMinutes: number;
  sessionTtlMinutes: number;
}

export class JwtService {
  constructor(private readonly options: JwtServiceOptions) {}

  createTokenPair(
    userId: number,
    email: string,
    session?: { id: string; expiresAt: Date },
  ): TokenPair {
    const issuedAt = new Date();
    const sessionId = session?.id ?? randomUUID();
    const sessionExpiresAt =
      session?.expiresAt ??
      new Date(issuedAt.getTime() + this.options.sessionTtlMinutes * MINUTE_MS);

    const accessExpiresAt = new Date(
      Math.min(
        issuedAt.getTime() + this.options.accessTtlMinutes * MINUTE_MS,
        sessionExpiresAt.getTime(),
      ),
    );

    return {
      accessToken: this.sign({
        userId,
        email,
        tokenType: ACCESS_TOKEN_TYPE,
        issuedAt,
        expiresAt: accessExpiresAt,
        sessionId,
        sessionExpiresAt,
      }),
      refreshToken: this.sign({
        userId,
        email,
        tokenType: REFRESH_TOKEN_TYPE,
        issuedAt,
        expiresAt: sessionExpiresAt,
        sessionId,
        sessionExpiresAt,
      }),
    };
  }

  verify(token: string, expectedType: TokenType): TokenClaims {
    const payload = jwt.verify(token, this.options.secret, {
      algorithms: [this.options.algorithm],
      issuer: this.options.issuer,
      audience: this.options.audience,
    });

    if (typeof payload === "string") {
      throw new Error("JWT payload must be an object");
    }

    const claims = readClaims(payload);
    if (!/^[1-9]\d*$/.test(claims.sub) || Number(claims.sub) > MAX_USER_ID) {
      throw new Error("JWT has invalid user ID");
    }
    if (
      !Number.isFinite(claims.session_exp) ||
      !Number.isFinite(claims.exp) ||
      claims.session_exp < claims.exp
    ) {
      throw new Error("JWT has invalid session claims");
    }
    if (claims.typ !== expectedType) {
      throw new Error(`Invalid token type: expected ${expectedType}, got ${claims.typ}`);
    }

    return toEntity(claims);
  }

  private sign(input: {
    userId: number;
    email: string;
    tokenType: TokenType;
    issuedAt: Date;
    expiresAt: Date;
    sessionId: string;
    sessionExpiresAt: Date;
  }): string {
    const payload: RawClaims = {
      sub: String(input.userId),
      email: input.email,
      jti: randomUUID(),
      typ: input.tokenType,
      sid: input.sessionId,
      session_exp: toSeconds(input.sessionExpiresAt),
      exp: toSeconds(input.expiresAt),
    };

    return jwt.sign(payload, this.options.secret, {
      algorithm: this.options.algorithm,
      issuer: this.options.issuer,
      audience: this.options.audience,
      // `exp` is set explicitly above so the access token can never outlive its session.
      noTimestamp: false,
    });
  }
}

function readClaims(payload: JwtPayload): RawClaims {
  const tokenType = readStringClaim(payload, "typ");
  if (tokenType !== ACCESS_TOKEN_TYPE && tokenType !== REFRESH_TOKEN_TYPE) {
    throw new Error(`JWT has invalid token type: ${tokenType}`);
  }

  return {
    sub: readStringClaim(payload, "sub"),
    email: readStringClaim(payload, "email"),
    jti: readStringClaim(payload, "jti"),
    typ: tokenType,
    sid: readStringClaim(payload, "sid"),
    session_exp: readNumberClaim(payload, "session_exp"),
    exp: readNumberClaim(payload, "exp"),
  };
}

function readStringClaim(payload: JwtPayload, name: string): string {
  const value: unknown = payload[name];
  if (typeof value !== "string" || value === "") {
    throw new Error(`JWT is missing required claim: ${name}`);
  }
  return value;
}

function readNumberClaim(payload: JwtPayload, name: string): number {
  const value: unknown = payload[name];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`JWT is missing required claim: ${name}`);
  }
  return value;
}
