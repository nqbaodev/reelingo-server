import type { RecentLogEntry } from "@/application/interfaces/logging/recent-log-reader";
import type {
  AdminLogListResponseDto,
  AdminLogResponseDto,
} from "@/presentation/dtos/admin-logs/admin-log.dto";

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
