import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { sendSuccess } from "@/core/http";
import { I18n } from "@/core/i18n";
import { requireCurrentUserId } from "@/features/auth/presentation/require-auth";
import type {
  CreateProjectUseCase,
  GetProjectUseCase,
  ListProjectsUseCase,
  UpdateProjectTitleUseCase,
} from "../../application";
import type {
  ListProjectsQueryDto,
  ProjectParamsDto,
  ProjectTitleRequestDto,
} from "../dtos/project.dto";
import {
  toProjectListResponse,
  toProjectResponse,
} from "../presenters/project.presenter";

interface ProjectControllerDeps {
  createProject: CreateProjectUseCase;
  getProject: GetProjectUseCase;
  listProjects: ListProjectsUseCase;
  updateProjectTitle: UpdateProjectTitleUseCase;
}

export class ProjectController {
  constructor(private readonly deps: ProjectControllerDeps) {}

  create = async (
    req: Request<ParamsDictionary, unknown, ProjectTitleRequestDto>,
    res: Response,
  ) => {
    const project = await this.deps.createProject.execute(
      requireCurrentUserId(req),
      req.body.title,
    );
    sendSuccess(res, toProjectResponse(project), I18n.projectCreated, 201);
  };

  list = async (req: Request, res: Response) => {
    const page = await this.deps.listProjects.execute(
      requireCurrentUserId(req),
      req.validatedQuery as ListProjectsQueryDto,
    );
    sendSuccess(res, toProjectListResponse(page));
  };

  get = async (req: Request, res: Response) => {
    const { projectId } = req.params as ProjectParamsDto;
    const project = await this.deps.getProject.execute(
      requireCurrentUserId(req),
      projectId,
    );
    sendSuccess(res, toProjectResponse(project));
  };

  updateTitle = async (
    req: Request<ParamsDictionary, unknown, ProjectTitleRequestDto>,
    res: Response,
  ) => {
    const { projectId } = req.params as ProjectParamsDto;
    const project = await this.deps.updateProjectTitle.execute(
      requireCurrentUserId(req),
      projectId,
      req.body.title,
    );
    sendSuccess(res, toProjectResponse(project), I18n.updated);
  };
}
