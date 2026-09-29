import type { Request, Response } from "express";
import { sendSuccess } from "@/core/http";
import type { ListAdminLogsUseCase } from "../../application";
import type { ListAdminLogsQueryDto } from "../dtos/admin-log.dto";
import { toAdminLogListResponse } from "../presenters/admin-log.presenter";

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
