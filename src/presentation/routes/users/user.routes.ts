import type { Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/presentation/http";
import { endpoints } from "@/presentation/http/endpoints";
import type { UserController } from "@/presentation/controllers/users/user.controller";
import { updateProfileSchema } from "@/presentation/dtos/users/user.dto";

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
