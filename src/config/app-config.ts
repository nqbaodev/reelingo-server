import "dotenv/config";
import { z } from "zod";
import { SECOND_MS } from "@/core/utils";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_CONNECT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(60_000)
    .default(3_000),
  DATABASE_QUERY_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(60_000)
    .default(5_000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  CORS_ORIGIN: z.string().default("*"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().max(300_000).default(30_000),
  GEMINI_IMAGE_MODEL: z.string().min(1).default("gemini-3.1-flash-image"),
  GEMINI_VIDEO_MODEL: z.string().min(1).default("veo-3.1-fast-generate-preview"),
  AI_GENERATION_WORKER_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  AI_GENERATION_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(60_000)
    .default(1_000),
  AI_GENERATION_LEASE_MS: z.coerce
    .number()
    .int()
    .min(10_000)
    .max(300_000)
    .default(60_000),
  AI_GENERATION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(30_000)
    .max(900_000)
    .default(600_000),
  AI_VIDEO_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(60_000)
    .default(2_000),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ISSUER: z.string().default("reelingo-server"),
  JWT_AUDIENCE: z.string().default("reelingo-api"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(10_080),
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  AUTH_RATE_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  API_RATE_LIMIT: z.coerce.number().int().positive().default(100),
  API_RATE_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  PUBLIC_BASE_URL: z.url().optional(),
  MEDIA_STORAGE_ROOT: z.string().trim().min(1).default("storage/media"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  throw new Error("Invalid environment variables");
}

const validatedEnv = parsed.data;

export const appConfig = {
  nodeEnv: validatedEnv.NODE_ENV,
  isDevelopment: validatedEnv.NODE_ENV === "development",
  isProduction: validatedEnv.NODE_ENV === "production",
  isTest: validatedEnv.NODE_ENV === "test",

  server: {
    port: validatedEnv.PORT,
    corsOrigin: validatedEnv.CORS_ORIGIN,
    publicBaseUrl:
      validatedEnv.PUBLIC_BASE_URL ?? `http://localhost:${validatedEnv.PORT}`,
  },

  http: {
    headers: {
      /** Correlates a response with its log lines; echoed back if the client sends one. */
      requestId: "X-Request-ID",
    },
  },

  i18n: {
    headers: {
      /** Request header that explicitly selects the message language. */
      language: "X-Language",
      /** Response header announcing which language the message is in. */
      contentLanguage: "Content-Language",
    },
  },

  logger: {
    level: validatedEnv.LOG_LEVEL,
  },

  database: {
    url: validatedEnv.DATABASE_URL,
    connectTimeoutMs: validatedEnv.DATABASE_CONNECT_TIMEOUT_MS,
    queryTimeoutMs: validatedEnv.DATABASE_QUERY_TIMEOUT_MS,
  },

  rateLimit: {
    api: {
      limit: validatedEnv.API_RATE_LIMIT,
      windowMs: validatedEnv.API_RATE_WINDOW_SECONDS * SECOND_MS,
    },
    auth: {
      limit: validatedEnv.AUTH_RATE_LIMIT,
      windowMs: validatedEnv.AUTH_RATE_WINDOW_SECONDS * SECOND_MS,
    },
  },

  auth: {
    google: {
      clientId: validatedEnv.GOOGLE_CLIENT_ID,
    },
    jwt: {
      algorithm: "HS256",
      secret: validatedEnv.JWT_SECRET,
      issuer: validatedEnv.JWT_ISSUER,
      audience: validatedEnv.JWT_AUDIENCE,
      accessTtlMinutes: validatedEnv.ACCESS_TOKEN_TTL_MINUTES,
      sessionTtlMinutes: validatedEnv.SESSION_TTL_MINUTES,
    },
  },

  ai: {
    gemini: {
      apiKey: validatedEnv.GEMINI_API_KEY,
      model: validatedEnv.GEMINI_MODEL,
      timeoutMs: validatedEnv.GEMINI_TIMEOUT_MS,
    },
    generation: {
      workerEnabled: validatedEnv.AI_GENERATION_WORKER_ENABLED,
      pollIntervalMs: validatedEnv.AI_GENERATION_POLL_INTERVAL_MS,
      leaseMs: validatedEnv.AI_GENERATION_LEASE_MS,
      timeoutMs: validatedEnv.AI_GENERATION_TIMEOUT_MS,
      videoPollIntervalMs: validatedEnv.AI_VIDEO_POLL_INTERVAL_MS,
      imageModel: validatedEnv.GEMINI_IMAGE_MODEL,
      videoModel: validatedEnv.GEMINI_VIDEO_MODEL,
    },
  },

  media: {
    storageRoot: validatedEnv.MEDIA_STORAGE_ROOT,
  },
} as const;
