import { z } from "zod";
import { MAX_PROJECT_TITLE_LENGTH } from "@/application/constants";
import { createCursorSchema, paginationLimitSchema } from "@/application/pagination";
import { containsNullByte } from "@/utils";

export const projectTitleSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(1)
    .max(MAX_PROJECT_TITLE_LENGTH)
    .refine((title) => !containsNullByte(title)),
});

export const projectParamsSchema = z.strictObject({ projectId: z.uuid() });

const projectCursorPayloadSchema = z.strictObject({
  updatedAt: z.iso.datetime(),
  projectId: z.uuid(),
});

export const listProjectsQuerySchema = z
  .strictObject({
    limit: paginationLimitSchema,
    cursor: createCursorSchema(projectCursorPayloadSchema).optional(),
  })
  .transform(({ limit, cursor }) => ({
    limit,
    cursor: cursor
      ? { updatedAt: new Date(cursor.updatedAt), projectId: cursor.projectId }
      : undefined,
  }));

export type ProjectTitleRequestDto = z.infer<typeof projectTitleSchema>;
export type ProjectParamsDto = z.infer<typeof projectParamsSchema>;
export type ListProjectsQueryDto = z.infer<typeof listProjectsQuerySchema>;

export interface ProjectResponseDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
