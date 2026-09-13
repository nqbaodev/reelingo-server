import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ServiceUnavailableError, UnauthorizedError } from "@/core/errors";
import type { User } from "@/features/users/domain";
import type { UserRepository } from "@/features/users/infrastructure";
import { ACCESS_TOKEN_TYPE, type TokenClaims } from "../domain";
import {
  type JwtService,
  type TokenRevocationStore,
  TokenRevocationStoreError,
} from "../infrastructure";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- augmenting Express's global types requires namespace syntax
  namespace Express {
    interface Request {
      auth?: { user: User; claims: TokenClaims };
    }
  }
}

export function createAuthenticate(deps: {
  users: UserRepository;
  jwt: JwtService;
  revocations: TokenRevocationStore;
}): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = readBearerToken(req.headers.authorization);

      let claims: TokenClaims;
      try {
        claims = deps.jwt.verify(token, ACCESS_TOKEN_TYPE);
      } catch {
        throw new UnauthorizedError("Invalid or expired token");
      }

      let revoked: boolean;
      try {
        revoked =
          (await deps.revocations.isTokenRevoked(claims.tokenId)) ||
          (await deps.revocations.isSessionRevoked(claims.sessionId));
      } catch (err) {
        if (err instanceof TokenRevocationStoreError) {
          throw new ServiceUnavailableError("Session store is unavailable");
        }
        throw err;
      }
      if (revoked) {
        throw new UnauthorizedError("Invalid or expired token");
      }

      const user = await deps.users.findById(claims.userId);
      if (!user) {
        throw new UnauthorizedError("User not found");
      }
      if (claims.email !== user.email) {
        throw new UnauthorizedError("Invalid token payload");
      }

      req.auth = { user, claims };
      next();
    } catch (err) {
      next(err);
    }
  };
}

function readBearerToken(header: string | undefined): string {
  const [scheme, value] = (header ?? "").split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) {
    throw new UnauthorizedError("Missing bearer token");
  }
  return value;
}
