import type { PrismaClient } from "@/generated/prisma/client";
import {
  type TokenRevocationStore,
  TokenRevocationStoreError,
} from "./token-revocation.store";

const UNIQUE_VIOLATION = "P2002";

export class TokenRevocationPrismaStore implements TokenRevocationStore {
  constructor(private readonly prisma: PrismaClient) {}

  async isTokenRevoked(tokenId: string): Promise<boolean> {
    return this.exists(tokenKey(tokenId));
  }

  async consumeToken(tokenId: string, expiresAt: Date): Promise<boolean> {
    if (expiresAt.getTime() <= Date.now()) {
      return false;
    }
    try {
      await this.prisma.revokedKey.create({
        data: { key: tokenKey(tokenId), expiresAt },
      });
      return true;
    } catch (err) {
      // The primary key turns a replayed refresh token into a conflict, which
      // is the signal that someone already used it.
      if (isUniqueViolation(err)) {
        return false;
      }
      throw new TokenRevocationStoreError("Token revocation write failed");
    }
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    return this.exists(sessionKey(sessionId));
  }

  async revokeSession(sessionId: string, expiresAt: Date): Promise<void> {
    if (expiresAt.getTime() <= Date.now()) {
      return;
    }
    try {
      await this.prisma.revokedKey.upsert({
        where: { key: sessionKey(sessionId) },
        create: { key: sessionKey(sessionId), expiresAt },
        update: { expiresAt },
      });
    } catch {
      throw new TokenRevocationStoreError("Session revocation write failed");
    }
  }

  private async exists(key: string): Promise<boolean> {
    let record;
    try {
      record = await this.prisma.revokedKey.findUnique({ where: { key } });
    } catch {
      throw new TokenRevocationStoreError("Token revocation read failed");
    }
    return record !== null && record.expiresAt.getTime() > Date.now();
  }
}

function tokenKey(tokenId: string): string {
  return `token:${tokenId}`;
}

function sessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === UNIQUE_VIOLATION
  );
}
