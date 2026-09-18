import type { Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/core/http";
import { endpoints } from "@/shared/http/endpoints";
import type { MediaController } from "./media.controller";
import { uploadSingleImage } from "./media-upload.middleware";
import { deleteMediaSchema, mediaParamsSchema } from "./media.validators";

export function createMediaRouter(controller: MediaController): Router {
  return createBaseRouter([
    {
      method: HttpMethod.POST,
      path: endpoints.media.upload,
      middlewares: [uploadSingleImage],
      handler: controller.upload,
    },
    {
      method: HttpMethod.POST,
      path: endpoints.media.delete,
      middlewares: [validate({ body: deleteMediaSchema })],
      handler: controller.delete,
    },
    {
      method: HttpMethod.GET,
      path: endpoints.media.byId,
      middlewares: [validate({ params: mediaParamsSchema })],
      handler: controller.get,
    },
  ]);
}
