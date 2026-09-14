export const endpoints = {
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
} as const;
