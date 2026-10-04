import {
  encodeCursor,
  type CursorListResponse,
  type CursorPage,
} from "@/application/pagination";
import type { ProjectListCursor } from "@/application/interfaces/repositories/project.repository";
import type { Project } from "@/domain";
import type { ProjectResponseDto } from "@/presentation/dtos/projects/project.dto";
import { toUnixMilliseconds } from "@/utils";

export function toProjectResponse(project: Project): ProjectResponseDto {
  return {
    id: project.id,
    title: project.title,
    createdAt: toUnixMilliseconds(project.createdAt),
    updatedAt: toUnixMilliseconds(project.updatedAt),
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
