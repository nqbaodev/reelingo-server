import type { RecentLogEntry } from "@/shared/logger/recent-log-store";
import type { AdminLogListResponseDto, AdminLogResponseDto } from "../dtos/admin-log.dto";

function toAdminLogResponse(entry: RecentLogEntry): AdminLogResponseDto {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    attributes: entry.attributes,
  };
}

export function toAdminLogListResponse(
  entries: RecentLogEntry[],
): AdminLogListResponseDto {
  return { items: entries.map(toAdminLogResponse) };
}
