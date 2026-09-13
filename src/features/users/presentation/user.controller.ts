import type { Request, Response } from "express";
import { sendSuccess } from "@/core/http";
import type { PaginationParams } from "@/core/types/pagination";
import type {
  DeleteUserUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
} from "../application";
import { toUserListResponse, toUserResponse } from "./user.presenter";
import { I18n } from "@/core/i18n";

interface UserControllerDeps {
  getUser: GetUserUseCase;
  listUsers: ListUsersUseCase;
  updateUser: UpdateUserUseCase;
  deleteUser: DeleteUserUseCase;
}

export class UserController {
  constructor(private readonly deps: UserControllerDeps) {}

  getById = async (req: Request, res: Response) => {
    const user = await this.deps.getUser.execute(req.params.id as string);
    sendSuccess(res, toUserResponse(user));
  };

  list = async (req: Request, res: Response) => {
    const result = await this.deps.listUsers.execute(
      req.validatedQuery as PaginationParams,
    );
    sendSuccess(res, toUserListResponse(result));
  };

  update = async (req: Request, res: Response) => {
    const user = await this.deps.updateUser.execute(req.params.id as string, req.body);
    sendSuccess(res, toUserResponse(user), I18n.updated);
  };

  delete = async (req: Request, res: Response) => {
    await this.deps.deleteUser.execute(req.params.id as string);
    res.status(204).send();
  };
}
