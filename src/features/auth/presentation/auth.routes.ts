import type { RequestHandler, Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/core/http";
import { endpoints } from "@/shared/http/endpoints";
import type { AuthController } from "./auth.controller";
import { googleLoginSchema, refreshTokenSchema } from "./auth.validators";

export function createAuthRouter(
  controller: AuthController,
  authenticate: RequestHandler,
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
    {
      method: HttpMethod.POST,
      path: endpoints.auth.logout,
      middlewares: [authenticate],
      handler: controller.logout,
    },
    {
      method: HttpMethod.GET,
      path: endpoints.auth.me,
      middlewares: [authenticate],
      handler: controller.me,
    },
  ]);
}
