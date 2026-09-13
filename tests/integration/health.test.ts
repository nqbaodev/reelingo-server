import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "@/app";

describe("GET /health", () => {
  it("reports process liveness without touching the database", async () => {
    const res = await request(createApp()).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptime).toBe("number");
  });
});
