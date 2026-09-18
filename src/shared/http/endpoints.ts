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
  conversations: {
    root: "/conversations",
    byId: "/conversations/:conversationId",
  },
  messages: {
    byConversation: "/conversations/:conversationId/messages",
  },
  media: {
    upload: "/media",
    delete: "/media/delete",
    byId: "/media/:mediaId",
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
