import type { RequestHandler } from "express";
import { config } from "@/config";
import { type Language, resolveLanguage } from "@/core/i18n";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation
  namespace Express {
    interface Request {
      language?: Language;
    }
  }
}

const { language: LANGUAGE_HEADER, contentLanguage: CONTENT_LANGUAGE_HEADER } =
  config.i18n.headers;

export const languageMiddleware: RequestHandler = (req, res, next) => {
  req.language = resolveLanguage(req.get(LANGUAGE_HEADER), req.get("Accept-Language"));
  res.setHeader(CONTENT_LANGUAGE_HEADER, req.language);
  res.vary(LANGUAGE_HEADER);
  res.vary("Accept-Language");
  next();
};
