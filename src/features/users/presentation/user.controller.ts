import type { Request, Response } from "express";
import type {
  CreateUserUseCase,
  DeleteUserUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
} from "../application";
import { toUserListResponse, toUserResponse } from "./user.presenter";

interface UserControllerDeps {
  createUser: CreateUserUseCase;
  getUser: GetUserUseCase;
  listUsers: ListUsersUseCase;
  updateUser: UpdateUserUseCase;
  deleteUser: DeleteUserUseCase;
}

export class UserController {
  constructor(private readonly deps: UserControllerDeps) {}

  create = async (req: Request, res: Response) => {
    const user = await this.deps.createUser.execute(req.body);
    res.status(201).json(toUserResponse(user));
  };

  getById = async (req: Request, res: Response) => {
    const user = await this.deps.getUser.execute(req.params.id as string);
    res.status(200).json(toUserResponse(user));
  };

  list = async (req: Request, res: Response) => {
    const { page, pageSize } = req.query as unknown as {
      page: number;
      pageSize: number;
    };
    const result = await this.deps.listUsers.execute({ page, pageSize });
    res.status(200).json(toUserListResponse(result));
  };

  update = async (req: Request, res: Response) => {
    const user = await this.deps.updateUser.execute(
      req.params.id as string,
      req.body,
    );
    res.status(200).json(toUserResponse(user));
  };

  delete = async (req: Request, res: Response) => {
    await this.deps.deleteUser.execute(req.params.id as string);
    res.status(204).send();
  };
}
