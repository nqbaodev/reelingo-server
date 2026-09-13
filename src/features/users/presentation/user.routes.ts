import { Router } from "express";
import { asyncHandler, validate } from "@/core/http";
import type { UserController } from "./user.controller";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamsSchema,
} from "./user.validators";

export function createUserRouter(controller: UserController): Router {
  const router = Router();

  router.post(
    "/users",
    validate({ body: createUserSchema }),
    asyncHandler(controller.create),
  );

  router.get(
    "/users",
    validate({ query: listUsersQuerySchema }),
    asyncHandler(controller.list),
  );

  router.get(
    "/users/:id",
    validate({ params: userIdParamsSchema }),
    asyncHandler(controller.getById),
  );

  router.patch(
    "/users/:id",
    validate({ params: userIdParamsSchema, body: updateUserSchema }),
    asyncHandler(controller.update),
  );

  router.delete(
    "/users/:id",
    validate({ params: userIdParamsSchema }),
    asyncHandler(controller.delete),
  );

  return router;
}
