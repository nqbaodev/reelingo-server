import { SECOND_MS } from "@/core/utils";
import { env } from "./env";

/**
 * The single place application code reads settings from — both values that
 * come from the environment and the static constants that define the API
 * contract (header names). Modules depend on these
 * domain-shaped groups rather than on raw variable names or string literals.
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

  endpoints: {
    apiPrefix: "/api/v1",
    auth: {
      googleLogin: "/auth/login/google",
      refresh: "/auth/refresh",
      logout: "/auth/logout",
      me: "/me",
    },
    users: {
      list: "/users",
      byId: "/users/:id",
    },
    ai: {
      generate: "/ai/generate",
    },
    health: {
      liveness: "/health",
      readiness: "/ready",
    },
    docs: {
      ui: "/docs",
      document: "/openapi.json",
    },
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
    level: env.LOG_LEVEL,
  },

  database: {
    url: env.DATABASE_URL,
    connectTimeoutMs: env.DATABASE_CONNECT_TIMEOUT_MS,
    queryTimeoutMs: env.DATABASE_QUERY_TIMEOUT_MS,
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
      algorithm: "HS256",
      secret: env.JWT_SECRET,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      accessTtlMinutes: env.ACCESS_TOKEN_TTL_MINUTES,
      sessionTtlMinutes: env.SESSION_TTL_MINUTES,
    },
  },

  ai: {
    gemini: {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      timeoutMs: env.GEMINI_TIMEOUT_MS,
    },
  },
} as const;

export type Config = typeof config;
