import type {
  AdminLogLevel,
  RecentLogEntry,
  RecentLogReader,
} from "@/application/interfaces/logging/recent-log-reader";

export interface ListAdminLogsQuery {
  limit: number;
  level?: AdminLogLevel;
  requestId?: string;
  search?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasRequestId(entry: RecentLogEntry, requestId: string): boolean {
  if (entry.attributes.requestId === requestId) return true;

  const request = entry.attributes.req;
  return isRecord(request) && request.id === requestId;
}

function containsSearch(entry: RecentLogEntry, search: string): boolean {
  const normalizedSearch = search.toLocaleLowerCase("en");
  if (entry.message.toLocaleLowerCase("en").includes(normalizedSearch)) return true;

  return JSON.stringify(entry.attributes)
    .toLocaleLowerCase("en")
    .includes(normalizedSearch);
}

export class ListAdminLogsUseCase {
  constructor(private readonly logs: RecentLogReader) {}

  execute(query: ListAdminLogsQuery): RecentLogEntry[] {
    const result: RecentLogEntry[] = [];

    for (const entry of this.logs.listRecent()) {
      if (query.level && entry.level !== query.level) continue;
      if (query.requestId && !hasRequestId(entry, query.requestId)) continue;
      if (query.search && !containsSearch(entry, query.search)) continue;

      result.push(entry);
      if (result.length === query.limit) break;
    }

    return result;
  }
}
