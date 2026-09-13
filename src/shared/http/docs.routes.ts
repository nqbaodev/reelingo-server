import { Router } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

export function createDocsRouter(document: object) {
  const router = Router();
  router.get("/openapi.json", (_req, res) => res.json(document));
  router.use(
    "/docs",
    helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }),
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: "/openapi.json",
        validatorUrl: null,
        persistAuthorization: false,
      },
      customSiteTitle: "Reelingo API",
    }),
  );
  return router;
}
