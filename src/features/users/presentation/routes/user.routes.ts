import type { Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/core/http";
import { endpoints } from "@/shared/http/endpoints";
import type { UserController } from "../controllers/user.controller";
import { updateProfileSchema } from "../dtos/user.dto";

export function createUserRouter(controller: UserController): Router {
  return createBaseRouter([
    {
      method: HttpMethod.GET,
      path: endpoints.users.me,
      handler: controller.me,
    },
    {
      method: HttpMethod.PUT,
      path: endpoints.users.me,
      middlewares: [validate({ body: updateProfileSchema })],
      handler: controller.updateProfile,
    },
  ]);
}
