import express, { type Express } from "express";
import { createContainer } from "./container";

export function createApp(): Express {
  const app = express();
  const container = createContainer();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));
  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });
  app.use(container.chatRouter);

  return app;
}
