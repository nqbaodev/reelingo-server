import { config } from "@/config";
import { Router } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

export function createDocsRouter(document: object) {
  const router = Router();
  router.get(config.endpoints.docs.document, (_req, res) => res.json(document));
  router.use(
    config.endpoints.docs.ui,
    helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }),
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: config.endpoints.docs.document,
        validatorUrl: null,
        persistAuthorization: false,
      },
      customSiteTitle: "Reelingo API",
    }),
  );
  return router;
}
