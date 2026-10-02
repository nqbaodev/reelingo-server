import type { Project } from "@/domain";
import type { ProjectRepository } from "@/application/interfaces/repositories/project.repository";

export class CreateProjectUseCase {
  constructor(private readonly projects: ProjectRepository) {}

  execute(userId: number, title: string): Promise<Project> {
    return this.projects.create(userId, title);
  }
}
