import type { CursorPage } from "@/application/pagination";
import type { Project } from "@/domain";

export interface ProjectListCursor {
  updatedAt: Date;
  projectId: string;
}

export interface ListProjectsInput {
  userId: number;
  limit: number;
  cursor: ProjectListCursor | undefined;
}

export interface ProjectRepository {
  create(userId: number, title: string): Promise<Project>;
  findOwnedById(id: string, userId: number): Promise<Project | null>;
  listByUser(input: ListProjectsInput): Promise<CursorPage<Project, ProjectListCursor>>;
  updateTitle(id: string, userId: number, title: string): Promise<Project | null>;
}
