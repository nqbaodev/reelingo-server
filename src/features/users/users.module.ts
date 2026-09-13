import type { PrismaClient } from "@/generated/prisma/client";
import {
  DeleteUserUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
} from "./application";
import { UserPrismaRepository } from "./infrastructure";
import { UserController, createUserRouter } from "./presentation";

/**
 * Composition root for the "users" feature: wires the concrete
 * infrastructure adapter into the use-cases and exposes an Express router.
 * Swapping persistence (e.g. Prisma -> another store) only touches this file.
 */
export function createUsersModule(prisma: PrismaClient) {
  const repository = new UserPrismaRepository(prisma);

  const controller = new UserController({
    getUser: new GetUserUseCase(repository),
    listUsers: new ListUsersUseCase(repository),
    updateUser: new UpdateUserUseCase(repository),
    deleteUser: new DeleteUserUseCase(repository),
  });

  return {
    router: createUserRouter(controller),
  };
}
