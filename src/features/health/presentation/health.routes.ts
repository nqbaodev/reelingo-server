import { HttpMethod, createBaseRouter } from "@/core/http";
import { endpoints } from "@/shared/http/endpoints";
import type { DatabaseReadiness } from "../infrastructure/database-readiness";

export function createHealthRouter(readiness: DatabaseReadiness) {
  return createBaseRouter([
    {
      method: HttpMethod.GET,
      path: endpoints.health.liveness,
      handler: (_req, res) => {
        res.status(200).json({ status: "ok", uptime: process.uptime() });
      },
    },
    {
      method: HttpMethod.GET,
      path: endpoints.health.readiness,
      handler: async (_req, res) => {
        const ready = await readiness.check();
        res.setHeader("Cache-Control", "no-store");
        res.status(ready ? 200 : 503).json({
          status: ready ? "ok" : "unavailable",
          database: ready ? "ok" : "unreachable",
        });
      },
    },
  ]);
}
