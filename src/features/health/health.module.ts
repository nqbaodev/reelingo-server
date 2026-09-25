import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaReadiness } from "./infrastructure/readiness/prisma-readiness";
import { createHealthRouter } from "./presentation/routes/health.routes";

export function createHealthModule(prisma: PrismaClient) {
  return { router: createHealthRouter(new PrismaReadiness(prisma)) };
}
