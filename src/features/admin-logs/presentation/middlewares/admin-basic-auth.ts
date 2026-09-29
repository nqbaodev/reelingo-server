import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import rateLimit from "express-rate-limit";
import { MINUTE_MS } from "@/core/utils";

const BASIC_AUTH_PATTERN = /^Basic ([A-Za-z0-9+/]+={0,2})$/iu;
const ADMIN_AUTH_ATTEMPT_LIMIT = 20;

export interface AdminCredentials {
  username: string;
  password: string;
}

function readBasicCredentials(header: string | undefined): AdminCredentials | null {
  const encoded = BASIC_AUTH_PATTERN.exec(header ?? "")?.[1];
  if (!encoded) return null;

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex < 0) return null;

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

function credentialDigest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function credentialsMatch(actual: string, expected: string): boolean {
  return timingSafeEqual(credentialDigest(actual), credentialDigest(expected));
}

function requestAuthentication(res: Response): void {
  res.setHeader("WWW-Authenticate", 'Basic realm="Reelingo Admin", charset="UTF-8"');
  res.setHeader("Cache-Control", "no-store");
  res.status(401).send("Authentication required");
}

export function createAdminBasicAuth(expected: AdminCredentials): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const actual = readBasicCredentials(req.headers.authorization);
    if (!actual) {
      requestAuthentication(res);
      return;
    }

    const usernameMatches = credentialsMatch(actual.username, expected.username);
    const passwordMatches = credentialsMatch(actual.password, expected.password);
    if (!usernameMatches || !passwordMatches) {
      requestAuthentication(res);
      return;
    }

    next();
  };
}

/** Limits failed Basic authentication attempts without charging successful asset loads. */
export function createAdminAuthRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: MINUTE_MS,
    limit: ADMIN_AUTH_ATTEMPT_LIMIT,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    requestWasSuccessful: (_req, res) => res.statusCode !== 401,
  });
}
