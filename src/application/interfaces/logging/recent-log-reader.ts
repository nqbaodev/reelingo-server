export const ADMIN_LOG_LEVELS = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
] as const;

export type AdminLogLevel = (typeof ADMIN_LOG_LEVELS)[number];

export interface RecentLogEntry {
  id: number;
  timestamp: string;
  level: AdminLogLevel;
  message: string;
  attributes: Record<string, unknown>;
}

export interface RecentLogReader {
  listRecent(): RecentLogEntry[];
}
