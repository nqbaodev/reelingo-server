import type { IncomingMessage, ServerResponse } from "node:http";
import pinoHttp from "pino-http";
import { assignRequestId } from "@/shared/middlewares/request-id";
import { logger } from "./logger";

function requestPath(req: IncomingMessage): string | undefined {
  return req.url?.split("?", 1)[0];
}

function requestLogLevel(_req: IncomingMessage, res: ServerResponse, err?: Error) {
  if (err || res.statusCode >= 500) return "error";
  if (res.statusCode >= 400) return "warn";
  return "info";
}

export const httpLogger = pinoHttp({
  logger,
  genReqId: assignRequestId,
  quietReqLogger: true,
  customAttributeKeys: {
    reqId: "requestId",
    responseTime: "durationMs",
  },
  customLogLevel: requestLogLevel,
  customReceivedMessage: (req) => `${req.method ?? "HTTP"} request received`,
  customSuccessMessage: (req, res) =>
    `${req.method ?? "HTTP"} request completed with ${res.statusCode}`,
  customErrorMessage: (req, res) =>
    `${req.method ?? "HTTP"} request failed with ${res.statusCode}`,
  wrapSerializers: false,
  serializers: {
    req(req: IncomingMessage) {
      return {
        id: req.id,
        method: req.method,
        path: requestPath(req),
        contentType: req.headers["content-type"],
        contentLength: req.headers["content-length"],
        remoteAddress: req.socket.remoteAddress,
      };
    },
    res(res: ServerResponse) {
      return { statusCode: res.statusCode };
    },
  },
});
