import { z } from "zod";
import { ADMIN_LOG_LEVELS, type AdminLogLevel } from "@/shared/logger/recent-log-store";

export const listAdminLogsQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  level: z.enum(ADMIN_LOG_LEVELS).optional(),
  requestId: z.string().trim().min(1).max(200).optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

export type ListAdminLogsQueryDto = z.infer<typeof listAdminLogsQuerySchema>;

export interface AdminLogResponseDto {
  id: number;
  timestamp: string;
  level: AdminLogLevel;
  message: string;
  attributes: Record<string, unknown>;
}

export interface AdminLogListResponseDto {
  items: AdminLogResponseDto[];
}
