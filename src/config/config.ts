import { env } from "./env";

const SECOND_MS = 1000;

/**
 * The single place application code reads settings from. Modules depend on
 * these domain-shaped groups rather than on raw environment variable names,
 * so renaming a variable stays contained to `env.ts`.
 */
export const config = {
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === "development",
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",

  server: {
    port: env.PORT,
    corsOrigin: env.CORS_ORIGIN,
  },

  logger: {
    level: env.LOG_LEVEL,
  },

  database: {
    url: env.DATABASE_URL,
  },

  rateLimit: {
    api: {
      limit: env.API_RATE_LIMIT,
      windowMs: env.API_RATE_WINDOW_SECONDS * SECOND_MS,
    },
    auth: {
      limit: env.AUTH_RATE_LIMIT,
      windowMs: env.AUTH_RATE_WINDOW_SECONDS * SECOND_MS,
    },
  },

  auth: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
    },
    jwt: {
      secret: env.JWT_SECRET,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      accessTtlMinutes: env.ACCESS_TOKEN_TTL_MINUTES,
      sessionTtlMinutes: env.SESSION_TTL_MINUTES,
    },
  },
} as const;

export type Config = typeof config;
