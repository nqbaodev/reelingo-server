import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "@/app";

const app = createApp();

describe("error envelope", () => {
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

  it("rejects a protected route without a bearer token", async () => {
    const res = await request(app).get("/api/v1/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.details).toBeUndefined();
  });
});
