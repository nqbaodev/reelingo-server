import { createApp } from "./app";
import { config } from "./config/app-config";

const app = createApp();

const server = app.listen(config.server.port, config.server.host, () => {
  console.info(
    `AI agent service listening on http://${config.server.host}:${config.server.port}`,
  );
});

function shutdown(signal: NodeJS.Signals): void {
  console.info(`Received ${signal}; stopping AI agent service`);
  server.close((error) => {
    if (error) {
      console.error("Failed to stop AI agent service cleanly", error);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
