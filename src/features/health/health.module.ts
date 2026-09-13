import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaReadiness } from "./infrastructure/prisma-readiness";
import { createHealthRouter } from "./presentation/health.routes";

export function createHealthModule(prisma: PrismaClient) {
  return { router: createHealthRouter(new PrismaReadiness(prisma)) };
}
