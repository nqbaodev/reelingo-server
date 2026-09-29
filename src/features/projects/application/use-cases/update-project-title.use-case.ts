import { NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import type { Project } from "../../domain";
import type { ProjectRepository } from "../../infrastructure";

export class UpdateProjectTitleUseCase {
  constructor(private readonly projects: ProjectRepository) {}

  async execute(userId: number, id: string, title: string): Promise<Project> {
    const project = await this.projects.updateTitle(id, userId, title);
    if (!project) throw new NotFoundError(I18n.projectNotFound);
    return project;
  }
}
