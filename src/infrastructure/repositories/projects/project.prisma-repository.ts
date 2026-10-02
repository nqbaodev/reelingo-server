import type { PrismaClient } from "@/generated/prisma/client";
import { createCursorPage, type CursorPage } from "@/application/pagination";
import { isPrismaRecordNotFound } from "@/infrastructure/database/prisma/prisma-error";
import type { Project } from "@/domain";
import { toEntity } from "@/infrastructure/mappers/projects/project.mapper";
import type {
  ListProjectsInput,
  ProjectListCursor,
  ProjectRepository,
} from "@/application/interfaces/repositories/project.repository";

export class ProjectPrismaRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: number, title: string): Promise<Project> {
    const record = await this.prisma.project.create({ data: { userId, title } });
    return toEntity(record);
  }

  async findOwnedById(id: string, userId: number): Promise<Project | null> {
    const record = await this.prisma.project.findFirst({
      where: { id, userId },
    });
    return record ? toEntity(record) : null;
  }

  async listByUser({
    userId,
    limit,
    cursor,
  }: ListProjectsInput): Promise<CursorPage<Project, ProjectListCursor>> {
    const records = await this.prisma.project.findMany({
      where: {
        userId,
        ...(cursor
          ? {
              OR: [
                { updatedAt: { lt: cursor.updatedAt } },
                {
                  updatedAt: cursor.updatedAt,
                  id: { lt: cursor.projectId },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const projects = records.map(toEntity);

    return createCursorPage(projects, limit, (project) => ({
      updatedAt: project.updatedAt,
      projectId: project.id,
    }));
  }

  async updateTitle(id: string, userId: number, title: string): Promise<Project | null> {
    try {
      const record = await this.prisma.project.update({
        where: { id, userId },
        data: { title },
      });
      return toEntity(record);
    } catch (err) {
      if (isPrismaRecordNotFound(err)) return null;
      throw err;
    }
  }
}
