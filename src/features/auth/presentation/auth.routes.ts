import { type RequestHandler, Router } from "express";
import { asyncHandler, validate } from "@/core/http";
import type { AuthController } from "./auth.controller";
import { googleLoginSchema, refreshTokenSchema } from "./auth.validators";

export function createAuthRouter(
  controller: AuthController,
  authenticate: RequestHandler,
  loginRateLimiter: RequestHandler,
): Router {
  const router = Router();

  router.post(
    "/auth/login/google",
    loginRateLimiter,
    validate({ body: googleLoginSchema }),
    asyncHandler(controller.loginWithGoogle),
  );

  router.post(
    "/auth/refresh",
    loginRateLimiter,
    validate({ body: refreshTokenSchema }),
    asyncHandler(controller.refresh),
  );

  router.post("/auth/logout", authenticate, asyncHandler(controller.logout));

  router.get("/me", authenticate, asyncHandler(controller.me));

  return router;
}
