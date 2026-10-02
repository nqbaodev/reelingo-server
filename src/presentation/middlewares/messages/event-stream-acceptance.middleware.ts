import type { NextFunction, Request, Response } from "express";
import { NotAcceptableError } from "@/application/errors";
import { I18n } from "@/application/i18n";

export function acceptsEventStream(req: Request): boolean {
  const accept = req.get("accept");
  if (!accept) return false;

  return accept.split(",").some((range) => {
    const [mediaType, ...parameters] = range
      .split(";")
      .map((part) => part.trim().toLowerCase());
    if (mediaType !== "text/event-stream") return false;

    const quality = parameters.find((parameter) => parameter.startsWith("q="));
    return quality === undefined || Number(quality.slice(2)) !== 0;
  });
}

export function requireEventStream(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.vary("Accept");
  if (!acceptsEventStream(req)) {
    throw new NotAcceptableError(I18n.eventStreamRequired);
  }

  next();
}
