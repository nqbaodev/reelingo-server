import type { PrismaClient } from "@/generated/prisma/client";
import { UpdateProfileUseCase } from "./application";
import { UserPrismaRepository } from "./infrastructure";
import { UserController, createUserRouter } from "./presentation";

export function createUsersModule(prisma: PrismaClient) {
  const repository = new UserPrismaRepository(prisma);

  const controller = new UserController({
    updateProfile: new UpdateProfileUseCase(repository),
  });

  return {
    router: createUserRouter(controller),
  };
}
