import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

function matchesToken(candidate: string, expected: string): boolean {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return (
    candidateBytes.length === expectedBytes.length &&
    timingSafeEqual(candidateBytes, expectedBytes)
  );
}

export function createServiceAuth(serviceToken: string): RequestHandler {
  return (request, response, next) => {
    const authorization = request.header("authorization");
    const candidate = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : "";

    if (!candidate || !matchesToken(candidate, serviceToken)) {
      response.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }

    next();
  };
}
