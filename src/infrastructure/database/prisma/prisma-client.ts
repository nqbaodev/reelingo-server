import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { config } from "@/config";

export function createPrismaClient(url = config.database.url) {
  const adapter = new PrismaPg({
    connectionString: url,
    connectionTimeoutMillis: config.database.connectTimeoutMs,
    statement_timeout: config.database.queryTimeoutMs,
    query_timeout: config.database.queryTimeoutMs,
  });

  return new PrismaClient({
    adapter,
    log: config.isDevelopment ? ["warn", "error"] : ["error"],
  });
}

export const prisma = createPrismaClient();
