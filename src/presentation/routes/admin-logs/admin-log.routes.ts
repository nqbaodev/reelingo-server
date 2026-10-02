import { Router } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { validate } from "@/presentation/http";
import { endpoints } from "@/presentation/http/endpoints";
import type { AdminLogController } from "@/presentation/controllers/admin-logs/admin-log.controller";
import { listAdminLogsQuerySchema } from "@/presentation/dtos/admin-logs/admin-log.dto";
import type { AdminCredentials } from "@/presentation/middlewares/admin-logs/admin-basic-auth";
import {
  createAdminAuthRateLimiter,
  createAdminBasicAuth,
} from "@/presentation/middlewares/admin-logs/admin-basic-auth";

export function createAdminLogRouter(
  controller: AdminLogController,
  credentials: AdminCredentials,
  document: object,
) {
  const router = Router();
  const authenticate = createAdminBasicAuth(credentials);
  const rateLimitAuthentication = createAdminAuthRateLimiter();

  router.use(endpoints.adminLogger.root, rateLimitAuthentication, authenticate);
  router.use(endpoints.adminLogger.ui, rateLimitAuthentication, authenticate);

  router.get(endpoints.adminLogger.document, (_req, res) => res.json(document));
  router.get(
    endpoints.adminLogger.logs,
    validate({ query: listAdminLogsQuerySchema }),
    controller.list,
  );
  router.use(
    endpoints.adminLogger.ui,
    helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }),
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: endpoints.adminLogger.document,
        validatorUrl: null,
        persistAuthorization: false,
        supportedSubmitMethods: ["get"],
      },
      customSiteTitle: "Reelingo Admin Logs",
    }),
  );

  return router;
}
