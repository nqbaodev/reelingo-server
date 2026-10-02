import {
  encodeCursor,
  type CursorListResponse,
  type CursorPage,
} from "@/application/pagination";
import type { Project } from "@/domain";
import type { ProjectListCursor } from "@/application/interfaces/repositories/project.repository";
import type { ProjectResponseDto } from "@/presentation/dtos/projects/project.dto";

export function toProjectResponse(project: Project): ProjectResponseDto {
  return {
    id: project.id,
    title: project.title,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export function toProjectListResponse(
  page: CursorPage<Project, ProjectListCursor>,
): CursorListResponse<ProjectResponseDto> {
  return {
    items: page.items.map(toProjectResponse),
    nextCursor: page.nextCursor
      ? encodeCursor({
          updatedAt: page.nextCursor.updatedAt.toISOString(),
          projectId: page.nextCursor.projectId,
        })
      : null,
  };
}
