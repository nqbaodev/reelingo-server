import { NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import type { Project } from "../../domain";
import type { ProjectRepository } from "../../infrastructure";

export class GetProjectUseCase {
  constructor(private readonly projects: ProjectRepository) {}

  async execute(userId: number, id: string): Promise<Project> {
    const project = await this.projects.findOwnedById(id, userId);
    if (!project) throw new NotFoundError(I18n.projectNotFound);
    return project;
  }
}
