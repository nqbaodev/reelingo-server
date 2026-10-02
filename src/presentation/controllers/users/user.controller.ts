import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { I18n } from "@/application/i18n";
import { sendSuccess } from "@/presentation/http";
import {
  requireAuth,
  requireCurrentUserId,
} from "@/presentation/middlewares/auth/require-auth";
import type { UpdateProfileUseCase } from "@/application/use-cases/users";
import type { UpdateProfileRequestDto } from "@/presentation/dtos/users/user.dto";
import { toCurrentUserResponse } from "@/presentation/presenters/users/user.presenter";

interface UserControllerDeps {
  updateProfile: UpdateProfileUseCase;
}

export class UserController {
  constructor(private readonly deps: UserControllerDeps) {}

  me = async (req: Request, res: Response) => {
    const authUser = requireAuth(req).user;
    sendSuccess(res, toCurrentUserResponse(authUser));
  };

  updateProfile = async (
    req: Request<ParamsDictionary, unknown, UpdateProfileRequestDto>,
    res: Response,
  ) => {
    const user = await this.deps.updateProfile.execute(
      requireCurrentUserId(req),
      req.body,
    );
    sendSuccess(res, toCurrentUserResponse(user), I18n.updated);
  };
}
