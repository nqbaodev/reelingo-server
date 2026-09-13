import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  CORS_ORIGIN: z.string().default("*"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ISSUER: z.string().default("reelingo-server"),
  JWT_AUDIENCE: z.string().default("reelingo-api"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(10_080),
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  AUTH_RATE_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
export type Env = typeof env;
