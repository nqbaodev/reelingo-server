import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "@/app";

const app = createApp();

describe("error envelope", () => {
  it("rejects extra Bearer credentials before verifying the token", async () => {
    const res = await request(app)
      .get("/api/v1/me")
      .set("Authorization", "Bearer invalid-token extra");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: "Missing bearer token",
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("translates an unknown route into a localized 404", async () => {
    const en = await request(app).get("/nope");
    const vi = await request(app).get("/nope").set("X-Language", "vi");

    expect(en.status).toBe(404);
    expect(en.body).toEqual({
      success: false,
      message: "Route not found",
      error: { code: "NOT_FOUND" },
    });
    expect(vi.body.message).toBe("Không tìm thấy đường dẫn");
    expect(vi.headers["content-language"]).toBe("vi");
  });

  it("names every invalid field on a validation failure", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login/google")
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual([
      { path: "idToken", message: expect.any(String) },
    ]);
  });

  it("maps a malformed JSON body to 400 without echoing it", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login/google")
      .set("Content-Type", "application/json")
      .send("{bad");

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code: "BAD_REQUEST" });
    expect(JSON.stringify(res.body)).not.toContain("{bad");
  });

  it("forwards an async controller rejection to the error handler", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: "invalid-token" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: "Invalid or expired token",
      error: { code: "UNAUTHORIZED" },
    });
  });

  it.each([
    ["get", "/api/v1/me"],
    ["post", "/api/v1/auth/logout"],
    ["get", "/api/v1/users"],
    ["get", "/api/v1/users/invalid-id"],
    ["patch", "/api/v1/users/invalid-id"],
    ["delete", "/api/v1/users/invalid-id"],
    ["post", "/api/v1/ai/generate"],
  ] as const)("rejects %s %s without a bearer token", async (method, path) => {
    const res = await request(app)[method](path);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.details).toBeUndefined();
  });
});
