import { Router } from "express";
import { asyncHandler } from "@/core/http";
import type { DatabaseReadiness } from "../infrastructure/database-readiness";

export function createHealthRouter(readiness: DatabaseReadiness) {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  });

  router.get(
    "/ready",
    asyncHandler(async (_req, res) => {
      const ready = await readiness.check();
      res.setHeader("Cache-Control", "no-store");
      res.status(ready ? 200 : 503).json({
        status: ready ? "ok" : "unavailable",
        database: ready ? "ok" : "unreachable",
      });
    }),
  );

  return router;
}
