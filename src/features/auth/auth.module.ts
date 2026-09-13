import { rateLimit } from "express-rate-limit";
import { config } from "@/config";
import { TooManyRequestsError } from "@/core/errors";
import type { PrismaClient } from "@/generated/prisma/client";
import { UserPrismaRepository } from "@/features/users/infrastructure";
import {
  LoginWithGoogleUseCase,
  LogoutUseCase,
  RefreshSessionUseCase,
} from "./application";
import {
  GoogleIdentityClient,
  JwtService,
  TokenRevocationPrismaStore,
} from "./infrastructure";
import { AuthController, createAuthRouter, createAuthenticate } from "./presentation";
import { I18n } from "@/core/i18n";

export function createAuthModule(prisma: PrismaClient) {
  const users = new UserPrismaRepository(prisma);
  const revocations = new TokenRevocationPrismaStore(prisma);
  const jwt = new JwtService(config.auth.jwt);

  const controller = new AuthController({
    googleIdentity: new GoogleIdentityClient(config.auth.google.clientId),
    loginWithGoogle: new LoginWithGoogleUseCase(users, jwt),
    refreshSession: new RefreshSessionUseCase(users, jwt, revocations),
    logout: new LogoutUseCase(revocations),
  });

  const authenticate = createAuthenticate({ users, jwt, revocations });
  const loginRateLimiter = rateLimit({
    windowMs: config.rateLimit.auth.windowMs,
    limit: config.rateLimit.auth.limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new TooManyRequestsError(I18n.tooManyRequests)),
  });

  return {
    router: createAuthRouter(controller, authenticate, loginRateLimiter),
    authenticate,
  };
}
