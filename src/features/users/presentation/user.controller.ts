import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { I18n } from "@/core/i18n";
import { sendSuccess } from "@/core/http";
import { requireAuth } from "@/features/auth/presentation/require-auth";
import type { UpdateProfileUseCase } from "../application";
import { toCurrentUserResponse } from "./user.presenter";
import type { UpdateProfileInput } from "./user.validators";

interface UserControllerDeps {
  updateProfile: UpdateProfileUseCase;
}

export class UserController {
  constructor(private readonly deps: UserControllerDeps) {}

  me = async (req: Request, res: Response) => {
    sendSuccess(res, toCurrentUserResponse(requireAuth(req).user));
  };

  updateProfile = async (
    req: Request<ParamsDictionary, unknown, UpdateProfileInput>,
    res: Response,
  ) => {
    const user = await this.deps.updateProfile.execute(
      requireAuth(req).user.id,
      req.body,
    );
    sendSuccess(res, toCurrentUserResponse(user), I18n.updated);
  };
}
