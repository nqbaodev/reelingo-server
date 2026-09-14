import { config } from "@/config";
import type { Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/core/http";
import type { UserController } from "./user.controller";
import {
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamsSchema,
} from "./user.validators";

export function createUserRouter(controller: UserController): Router {
  return createBaseRouter([
    {
      method: HttpMethod.GET,
      path: config.endpoints.users.list,
      middlewares: [validate({ query: listUsersQuerySchema })],
      handler: controller.list,
    },
    {
      method: HttpMethod.GET,
      path: config.endpoints.users.byId,
      middlewares: [validate({ params: userIdParamsSchema })],
      handler: controller.getById,
    },
    {
      method: HttpMethod.PATCH,
      path: config.endpoints.users.byId,
      middlewares: [
        validate({ params: userIdParamsSchema, body: updateUserSchema }),
      ],
      handler: controller.update,
    },
    {
      method: HttpMethod.DELETE,
      path: config.endpoints.users.byId,
      middlewares: [validate({ params: userIdParamsSchema })],
      handler: controller.delete,
    },
  ]);
}
