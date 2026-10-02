import type { Router } from "express";
import { HttpMethod, createBaseRouter, validate } from "@/presentation/http";
import { endpoints } from "@/presentation/http/endpoints";
import type { ProjectController } from "@/presentation/controllers/projects/project.controller";
import {
  listProjectsQuerySchema,
  projectParamsSchema,
  projectTitleSchema,
} from "@/presentation/dtos/projects/project.dto";

export function createProjectRouter(controller: ProjectController): Router {
  return createBaseRouter([
    {
      method: HttpMethod.GET,
      path: endpoints.projects.root,
      middlewares: [validate({ query: listProjectsQuerySchema })],
      handler: controller.list,
    },
    {
      method: HttpMethod.POST,
      path: endpoints.projects.root,
      middlewares: [validate({ body: projectTitleSchema })],
      handler: controller.create,
    },
    {
      method: HttpMethod.GET,
      path: endpoints.projects.byId,
      middlewares: [validate({ params: projectParamsSchema })],
      handler: controller.get,
    },
    {
      method: HttpMethod.PATCH,
      path: endpoints.projects.byId,
      middlewares: [validate({ params: projectParamsSchema, body: projectTitleSchema })],
      handler: controller.updateTitle,
    },
  ]);
}
