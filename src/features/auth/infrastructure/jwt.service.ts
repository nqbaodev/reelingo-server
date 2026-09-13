import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import {
  ACCESS_TOKEN_TYPE,
  REFRESH_TOKEN_TYPE,
  type TokenClaims,
  type TokenPair,
  type TokenType,
} from "../domain";

interface JwtServiceOptions {
  secret: string;
  issuer: string;
  audience: string;
  accessTtlMinutes: number;
  sessionTtlMinutes: number;
}

interface RawClaims {
  sub: string;
  email: string;
  jti: string;
  typ: TokenType;
  sid: string;
  session_exp: number;
  exp: number;
}

const MINUTE_MS = 60_000;

export class JwtService {
  constructor(private readonly options: JwtServiceOptions) {}

  createTokenPair(
    userId: string,
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
      algorithms: ["HS256"],
      issuer: this.options.issuer,
      audience: this.options.audience,
    });

    if (typeof payload === "string") {
      throw new Error("JWT payload must be an object");
    }

    const claims = payload as unknown as RawClaims;
    for (const claim of ["sub", "email", "jti", "typ", "sid"] as const) {
      if (typeof claims[claim] !== "string" || claims[claim] === "") {
        throw new Error(`JWT is missing required claim: ${claim}`);
      }
    }
    if (
      !Number.isFinite(claims.session_exp) ||
      !Number.isFinite(claims.exp) ||
      claims.session_exp < claims.exp
    ) {
      throw new Error("JWT has invalid session claims");
    }
    if (claims.typ !== expectedType) {
      throw new Error(
        `Invalid token type: expected ${expectedType}, got ${claims.typ}`,
      );
    }

    return {
      userId: claims.sub,
      email: claims.email,
      tokenId: claims.jti,
      tokenType: claims.typ,
      sessionId: claims.sid,
      sessionExpiresAt: new Date(claims.session_exp * 1000),
      expiresAt: new Date(claims.exp * 1000),
    };
  }

  private sign(input: {
    userId: string;
    email: string;
    tokenType: TokenType;
    issuedAt: Date;
    expiresAt: Date;
    sessionId: string;
    sessionExpiresAt: Date;
  }): string {
    const payload: RawClaims = {
      sub: input.userId,
      email: input.email,
      jti: randomUUID(),
      typ: input.tokenType,
      sid: input.sessionId,
      session_exp: toSeconds(input.sessionExpiresAt),
      exp: toSeconds(input.expiresAt),
    };

    return jwt.sign(payload, this.options.secret, {
      algorithm: "HS256",
      issuer: this.options.issuer,
      audience: this.options.audience,
      // `exp` is set explicitly above so the access token can never outlive its session.
      noTimestamp: false,
    });
  }
}

function toSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
