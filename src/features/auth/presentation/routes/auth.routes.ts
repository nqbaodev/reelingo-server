import type { RequestHandler, Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/core/http";
import { endpoints } from "@/shared/http/endpoints";
import type { AuthController } from "../controllers/auth.controller";
import { googleLoginSchema, refreshTokenSchema } from "../validators/auth.validators";

export function createPublicAuthRouter(
  controller: AuthController,
  loginRateLimiter: RequestHandler,
): Router {
  return createBaseRouter([
    {
      method: HttpMethod.POST,
      path: endpoints.auth.googleLogin,
      middlewares: [loginRateLimiter, validate({ body: googleLoginSchema })],
      handler: controller.loginWithGoogle,
    },
    {
      method: HttpMethod.POST,
      path: endpoints.auth.refresh,
      middlewares: [loginRateLimiter, validate({ body: refreshTokenSchema })],
      handler: controller.refresh,
    },
  ]);
}

export function createProtectedAuthRouter(controller: AuthController): Router {
  return createBaseRouter([
    {
      method: HttpMethod.POST,
      path: endpoints.auth.logout,
      handler: controller.logout,
    },
  ]);
}
