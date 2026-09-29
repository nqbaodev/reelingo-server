import type { CursorPage } from "@/core/pagination";
import type { Project } from "../../domain";
import type { ProjectListCursor, ProjectRepository } from "../../infrastructure";

export interface ListProjectsOptions {
  limit: number;
  cursor: ProjectListCursor | undefined;
}

export class ListProjectsUseCase {
  constructor(private readonly projects: ProjectRepository) {}

  execute(
    userId: number,
    options: ListProjectsOptions,
  ): Promise<CursorPage<Project, ProjectListCursor>> {
    return this.projects.listByUser({ userId, ...options });
  }
}
