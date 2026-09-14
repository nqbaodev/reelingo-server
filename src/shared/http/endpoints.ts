export const endpoints = {
  apiPrefix: "/api/v1",
  auth: {
    googleLogin: "/auth/login/google",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
  },
  users: {
    me: "/me",
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
} as const;
