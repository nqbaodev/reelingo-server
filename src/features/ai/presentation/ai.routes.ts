import { Router } from "express";
import { asyncHandler, validate } from "@/core/http";
import type { AiController } from "./ai.controller";
import { generateTextSchema } from "./ai.validators";

export function createAiRouter(controller: AiController): Router {
  const router = Router();

  router.post(
    "/ai/generate",
    validate({ body: generateTextSchema }),
    asyncHandler(controller.generate),
  );

  return router;
}
