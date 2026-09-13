import { rateLimit } from "express-rate-limit";
import { env } from "@/config/env";
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
import {
  AuthController,
  createAuthRouter,
  createAuthenticate,
} from "./presentation";

export function createAuthModule(prisma: PrismaClient) {
  const users = new UserPrismaRepository(prisma);
  const revocations = new TokenRevocationPrismaStore(prisma);
  const jwt = new JwtService({
    secret: env.JWT_SECRET,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    accessTtlMinutes: env.ACCESS_TOKEN_TTL_MINUTES,
    sessionTtlMinutes: env.SESSION_TTL_MINUTES,
  });

  const controller = new AuthController({
    googleIdentity: new GoogleIdentityClient(env.GOOGLE_CLIENT_ID),
    loginWithGoogle: new LoginWithGoogleUseCase(users, jwt),
    refreshSession: new RefreshSessionUseCase(users, jwt, revocations),
    logout: new LogoutUseCase(revocations),
  });

  const authenticate = createAuthenticate({ users, jwt, revocations });
  const loginRateLimiter = rateLimit({
    windowMs: env.AUTH_RATE_WINDOW_SECONDS * 1000,
    limit: env.AUTH_RATE_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
  });

  return {
    router: createAuthRouter(controller, authenticate, loginRateLimiter),
    authenticate,
  };
}
