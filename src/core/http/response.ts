import type { Response } from "express";
import { I18n, translate, type MessageKey } from "@/core/i18n";

/** Call after the feature presenter has selected the public response fields. */
export function sendSuccess<T>(
  res: Response,
  data: T,
  messageKey: MessageKey = I18n.requestCompleted,
  status = 200,
): void {
  res.status(status).json({
    success: true,
    message: translate(messageKey, res.req.language),
    data,
  });
}
