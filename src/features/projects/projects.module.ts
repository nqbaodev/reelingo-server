import type { PrismaClient } from "@/generated/prisma/client";
import {
  CreateProjectUseCase,
  GetProjectUseCase,
  ListProjectsUseCase,
  UpdateProjectTitleUseCase,
} from "./application";
import { ProjectPrismaRepository } from "./infrastructure";
import { ProjectController, createProjectRouter } from "./presentation";

export function createProjectsModule(prisma: PrismaClient) {
  const projects = new ProjectPrismaRepository(prisma);
  const controller = new ProjectController({
    createProject: new CreateProjectUseCase(projects),
    getProject: new GetProjectUseCase(projects),
    listProjects: new ListProjectsUseCase(projects),
    updateProjectTitle: new UpdateProjectTitleUseCase(projects),
  });

  return { router: createProjectRouter(controller) };
}
