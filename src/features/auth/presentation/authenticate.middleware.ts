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
import { I18n } from "@/core/i18n";

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
      } catch (err) {
        throw new UnauthorizedError(I18n.invalidToken, { cause: err });
      }

      let revoked: boolean;
      try {
        revoked =
          (await deps.revocations.isTokenRevoked(claims.tokenId)) ||
          (await deps.revocations.isSessionRevoked(claims.sessionId));
      } catch (err) {
        if (err instanceof TokenRevocationStoreError) {
          throw new ServiceUnavailableError(I18n.serviceUnavailable, { params: { service: "Session store" }, cause: err });
        }
        throw err;
      }
      if (revoked) {
        throw new UnauthorizedError(I18n.invalidToken);
      }

      const user = await deps.users.findById(claims.userId);
      if (!user) {
        throw new UnauthorizedError(I18n.userNotFound);
      }
      if (claims.email !== user.email) {
        throw new UnauthorizedError(I18n.invalidToken);
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
    throw new UnauthorizedError(I18n.missingToken);
  }
  return value;
}
