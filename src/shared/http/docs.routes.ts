import { Router } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { endpoints } from "./endpoints";

export function createDocsRouter(document: object) {
  const router = Router();
  router.get(endpoints.docs.document, (_req, res) => res.json(document));
  router.use(
    endpoints.docs.ui,
    helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }),
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: endpoints.docs.document,
        validatorUrl: null,
        persistAuthorization: false,
      },
      customSiteTitle: "Reelingo API",
    }),
  );
  return router;
}
