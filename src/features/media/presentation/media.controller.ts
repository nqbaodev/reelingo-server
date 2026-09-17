import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { ValidationError } from "@/core/errors";
import { sendSuccess } from "@/core/http";
import { I18n } from "@/core/i18n";
import { requireCurrentUserId } from "@/features/auth/presentation/require-auth";
import type { GetMediaContentUseCase, UploadImageUseCase } from "../application";
import { toMediaResponse } from "./media.presenter";
import type { MediaParams } from "./media.validators";

interface MediaControllerDeps {
  getMediaContent: GetMediaContentUseCase;
  uploadImage: UploadImageUseCase;
}

export class MediaController {
  constructor(private readonly deps: MediaControllerDeps) {}

  upload = async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError(I18n.mediaFileRequired);
    }

    const media = await this.deps.uploadImage.execute(
      requireCurrentUserId(req),
      req.file.buffer,
    );
    sendSuccess(res, toMediaResponse(media), I18n.mediaUploaded, 201);
  };

  get = async (req: Request<ParamsDictionary>, res: Response) => {
    const { mediaId } = req.params as MediaParams;
    const result = await this.deps.getMediaContent.execute(
      requireCurrentUserId(req),
      mediaId,
    );

    res.type(result.media.mimeType).send(Buffer.from(result.bytes));
  };
}
