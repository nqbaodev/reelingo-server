import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import { config } from "@/config";

const REQUEST_ID_HEADER = config.http.headers.requestId;
const VALID_REQUEST_ID = /^[a-zA-Z0-9._-]{1,128}$/;

/** Correlates the response with pino-http's request-scoped logger. */
export function assignRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incomingId = req.headers[REQUEST_ID_HEADER.toLowerCase()];
  const requestId =
    typeof incomingId === "string" && VALID_REQUEST_ID.test(incomingId)
      ? incomingId
      : randomUUID();

  res.setHeader(REQUEST_ID_HEADER, requestId);
  return requestId;
}
