import type { Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/presentation/http";
import { endpoints } from "@/presentation/http/endpoints";
import type { AssetController } from "@/presentation/controllers/assets/asset.controller";
import {
  assetParamsSchema,
  deleteAssetsSchema,
  listAssetsQuerySchema,
} from "@/presentation/dtos/assets/asset.dto";
import { uploadSingleImage } from "@/presentation/middlewares/assets/asset-upload.middleware";

export function createAssetRouter(controller: AssetController): Router {
  return createBaseRouter([
    {
      method: HttpMethod.POST,
      path: endpoints.assets.root,
      middlewares: [uploadSingleImage],
      handler: controller.upload,
    },
    {
      method: HttpMethod.GET,
      path: endpoints.assets.root,
      middlewares: [validate({ query: listAssetsQuerySchema })],
      handler: controller.list,
    },
    {
      method: HttpMethod.POST,
      path: endpoints.assets.delete,
      middlewares: [validate({ body: deleteAssetsSchema })],
      handler: controller.deleteUnused,
    },
    {
      method: HttpMethod.GET,
      path: endpoints.assets.byId,
      middlewares: [validate({ params: assetParamsSchema })],
      handler: controller.get,
    },
  ]);
}
