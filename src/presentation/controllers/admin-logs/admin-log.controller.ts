import type { Request, Response } from "express";
import { sendSuccess } from "@/presentation/http";
import type { ListAdminLogsUseCase } from "@/application/use-cases/admin-logs";
import type { ListAdminLogsQueryDto } from "@/presentation/dtos/admin-logs/admin-log.dto";
import { toAdminLogListResponse } from "@/presentation/presenters/admin-logs/admin-log.presenter";

export class AdminLogController {
  constructor(private readonly listAdminLogs: ListAdminLogsUseCase) {}

  list = (req: Request, res: Response) => {
    const entries = this.listAdminLogs.execute(
      req.validatedQuery as ListAdminLogsQueryDto,
    );
    res.setHeader("Cache-Control", "private, no-store");
    sendSuccess(res, toAdminLogListResponse(entries));
  };
}
