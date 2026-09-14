import { Router, type RequestHandler } from "express";
import type { HttpMethod } from "./http-method";

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  middlewares?: readonly RequestHandler[];
  handler: RequestHandler;
}

/** Registers routes in declaration order; Express 5 forwards async errors. */
export function createBaseRouter(routes: readonly RouteDefinition[]): Router {
  const router = Router();

  for (const route of routes) {
    router[route.method](
      route.path,
      ...(route.middlewares ?? []),
      route.handler,
    );
  }

  return router;
}
