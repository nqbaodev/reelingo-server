import type { RecentLogReader } from "@/shared/logger/recent-log-store";
import { ListAdminLogsUseCase } from "./application";
import {
  AdminLogController,
  type AdminCredentials,
  createAdminLogRouter,
} from "./presentation";

export function createAdminLogsModule(
  logs: RecentLogReader,
  credentials: AdminCredentials,
  document: object,
) {
  const controller = new AdminLogController(new ListAdminLogsUseCase(logs));

  return {
    router: createAdminLogRouter(controller, credentials, document),
  };
}
