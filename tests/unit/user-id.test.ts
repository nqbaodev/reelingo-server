import { randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { JwtService } from "@/features/auth/infrastructure/jwt.service";
import { ACCESS_TOKEN_TYPE, REFRESH_TOKEN_TYPE } from "@/features/auth/domain";

const options = {
  algorithm: "HS256" as const,
  secret: randomBytes(32).toString("hex"),
  issuer: "test-issuer",
  audience: "test-audience",
  accessTtlMinutes: 15,
  sessionTtlMinutes: 60,
};
const service = new JwtService(options);

describe("integer user IDs", () => {
  it("round-trips numeric user IDs through both token types", () => {
    const pair = service.createTokenPair(123, "user@example.com");
    expect(service.verify(pair.accessToken, ACCESS_TOKEN_TYPE).userId).toBe(123);
    expect(service.verify(pair.refreshToken, REFRESH_TOKEN_TYPE).userId).toBe(123);
    expect(jwt.decode(pair.accessToken)).toMatchObject({ sub: "123" });
  });

  it.each([randomUUID(), "0", "-1", "1.5", "1e2", "01", "2147483648"])(
    "rejects signed tokens with invalid user subject %s",
    (sub) => {
      const token = jwt.sign({
        sub,
        email: "user@example.com",
        jti: randomUUID(),
        typ: ACCESS_TOKEN_TYPE,
        sid: randomUUID(),
        exp: Math.floor(Date.now() / 1000) + 60,
        session_exp: Math.floor(Date.now() / 1000) + 120,
      }, options.secret, {
        algorithm: options.algorithm,
        issuer: options.issuer,
        audience: options.audience,
      });
      expect(() => service.verify(token, ACCESS_TOKEN_TYPE)).toThrow("JWT has invalid user ID");
    },
  );
});
