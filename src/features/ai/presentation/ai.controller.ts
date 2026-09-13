import type { Request, Response } from "express";
import { ServiceUnavailableError } from "@/core/errors";
import { sendSuccess } from "@/core/http";
import type { GenerateTextUseCase } from "../application";
import { GenerativeAiUnavailableError } from "../infrastructure";
import { toGenerateTextResponse } from "./ai.presenter";
import { I18n } from "@/core/i18n";

interface AiControllerDeps {
  generateText: GenerateTextUseCase;
}

export class AiController {
  constructor(private readonly deps: AiControllerDeps) {}

  generate = async (req: Request, res: Response) => {
    const { prompt } = req.body as { prompt: string };

    try {
      const text = await this.deps.generateText.execute(prompt);
      sendSuccess(res, toGenerateTextResponse(text), I18n.textGenerated);
    } catch (err) {
      throw err instanceof GenerativeAiUnavailableError
        ? new ServiceUnavailableError(I18n.serviceUnavailable, { params: { service: "AI generation" }, cause: err })
        : err;
    }
  };
}
