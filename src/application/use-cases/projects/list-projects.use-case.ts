import type { CursorPage } from "@/application/pagination";
import type { Project } from "@/domain";
import type {
  ProjectListCursor,
  ProjectRepository,
} from "@/application/interfaces/repositories/project.repository";

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
