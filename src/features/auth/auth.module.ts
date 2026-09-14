import { config } from "@/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { UserPrismaRepository } from "@/features/users/infrastructure";
import { createAuthRateLimiter } from "@/shared/middlewares";
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
  createAuthenticate,
  createProtectedAuthRouter,
  createPublicAuthRouter,
} from "./presentation";

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
  const loginRateLimiter = createAuthRateLimiter();

  return {
    publicRouter: createPublicAuthRouter(controller, loginRateLimiter),
    protectedRouter: createProtectedAuthRouter(controller),
    authenticate,
  };
}
