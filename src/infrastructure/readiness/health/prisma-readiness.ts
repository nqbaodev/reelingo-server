import type { PrismaClient } from "@/generated/prisma/client";
import type { DatabaseReadiness } from "@/application/interfaces/health/database-readiness";

export class PrismaReadiness implements DatabaseReadiness {
  constructor(private readonly prisma: PrismaClient) {}

  async check(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
