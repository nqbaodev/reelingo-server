import type { Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/core/http";
import { endpoints } from "@/shared/http/endpoints";
import type { AiController } from "./ai.controller";
import { generateTextSchema } from "./ai.validators";

export function createAiRouter(controller: AiController): Router {
  return createBaseRouter([
    {
      method: HttpMethod.POST,
      path: endpoints.ai.generate,
      middlewares: [validate({ body: generateTextSchema })],
      handler: controller.generate,
    },
  ]);
}
