export const endpoints = {
  apiPrefix: "/api/v1",
  auth: {
    googleLogin: "/auth/login/google",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
  },
  users: {
    me: "/auth/me",
  },
  projects: {
    root: "/projects",
    byId: "/projects/:projectId",
    conversations: "/projects/:projectId/conversations",
  },
  conversations: {
    byId: "/conversations/:conversationId",
  },
  messages: {
    events: "/messages/events",
    byConversation: "/conversations/:conversationId/messages",
    response: "/conversations/:conversationId/messages/:messageId/response",
  },
  assets: {
    root: "/assets",
    delete: "/assets/delete",
    byId: "/assets/:assetId",
  },
  health: {
    liveness: "/health",
    readiness: "/ready",
  },
  docs: {
    ui: "/docs",
    document: "/openapi.json",
  },
  adminLogger: {
    root: "/admin",
    ui: "/logger",
    document: "/admin/openapi.json",
    logs: "/admin/logs",
  },
} as const;
