import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { ValidationError } from "@/core/errors";
import { sendSuccess } from "@/core/http";
import { I18n } from "@/core/i18n";
import { requireCurrentUserId } from "@/features/auth/presentation/require-auth";
import type {
  DeleteUnusedAssetsUseCase,
  GetAssetContentUseCase,
  ListAssetsUseCase,
  UploadImageUseCase,
} from "../../application";
import type {
  AssetParamsDto,
  DeleteAssetsRequestDto,
  ListAssetsQueryDto,
} from "../dtos/asset.dto";
import {
  toAssetListResponse,
  toAssetResponse,
  toDeletedAssetsResponse,
} from "../presenters/asset.presenter";

interface AssetControllerDeps {
  deleteUnusedAssets: DeleteUnusedAssetsUseCase;
  getAssetContent: GetAssetContentUseCase;
  listAssets: ListAssetsUseCase;
  uploadImage: UploadImageUseCase;
}

export class AssetController {
  constructor(private readonly deps: AssetControllerDeps) {}

  upload = async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError(I18n.assetFileRequired);
    }

    const asset = await this.deps.uploadImage.execute(
      requireCurrentUserId(req),
      req.file.buffer,
    );
    sendSuccess(res, toAssetResponse(asset), I18n.assetUploaded, 201);
  };

  list = async (req: Request, res: Response) => {
    const page = await this.deps.listAssets.execute(
      requireCurrentUserId(req),
      req.validatedQuery as ListAssetsQueryDto,
    );
    sendSuccess(res, toAssetListResponse(page));
  };

  deleteUnused = async (
    req: Request<ParamsDictionary, unknown, DeleteAssetsRequestDto>,
    res: Response,
  ) => {
    const deletedIds = await this.deps.deleteUnusedAssets.execute(
      requireCurrentUserId(req),
      req.body.assetIds,
    );
    sendSuccess(res, toDeletedAssetsResponse(deletedIds), I18n.assetsDeleted);
  };

  get = async (req: Request<ParamsDictionary>, res: Response) => {
    const { assetId } = req.params as AssetParamsDto;
    const result = await this.deps.getAssetContent.execute(
      requireCurrentUserId(req),
      assetId,
    );

    res.type(result.asset.mimeType).send(Buffer.from(result.bytes));
  };
}
