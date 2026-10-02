import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { MAX_IMAGE_SIZE_BYTES } from "@/application/constants";
import {
  BadRequestError,
  PayloadTooLargeError,
  ValidationError,
} from "@/application/errors";
import { I18n } from "@/application/i18n";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
    fields: 0,
    parts: 1,
    headerPairs: 20,
  },
}).single("file");

export function uploadSingleImage(req: Request, res: Response, next: NextFunction): void {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        next(new PayloadTooLargeError(I18n.payloadTooLarge, { cause: err }));
        return;
      }

      next(new ValidationError(I18n.invalidAssetUpload, { cause: err }));
      return;
    }

    if (err) {
      next(new BadRequestError(I18n.invalidAssetUpload, { cause: err }));
      return;
    }

    next();
  });
}
