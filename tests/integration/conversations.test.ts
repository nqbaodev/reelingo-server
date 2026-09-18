import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "@/app";
import { config } from "@/config";
import { JwtService } from "@/features/auth/infrastructure";
import { createPrismaClient } from "@/shared/database/prisma-client";

const database = createPrismaClient();
const app = createApp({ database });
const jwt = new JwtService(config.auth.jwt);

const testId = randomUUID();
const otherTestId = randomUUID();
let userId: number;
let otherUserId: number;
let accessToken: string;
let setupCompleted = false;

beforeAll(async () => {
  const user = await database.user.create({
    data: {
      email: `conversation-${testId}@example.com`,
      name: "Conversation Test User",
      googleId: `conversation-${testId}`,
    },
  });
  const otherUser = await database.user.create({
    data: {
      email: `conversation-${otherTestId}@example.com`,
      name: "Other Conversation Test User",
      googleId: `conversation-${otherTestId}`,
    },
  });

  userId = user.id;
  otherUserId = otherUser.id;
  accessToken = jwt.createAuthTokens(user.id, user.email).accessToken;
  setupCompleted = true;
});

afterAll(async () => {
  if (setupCompleted) {
    await database.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  }
  await database.$disconnect();
});

describe("conversation commands", () => {
  it("creates a UUID conversation owned by the authenticated user", async () => {
    const res = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "  English practice  " });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      message: "Conversation created successfully",
      data: { name: "English practice" },
    });
    expect(res.body.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(new Date(res.body.data.createdAt).toISOString()).toBe(res.body.data.createdAt);

    const stored = await database.conversation.findUnique({
      where: { id: res.body.data.id },
    });
    expect(stored).toMatchObject({ userId, name: "English practice" });
  });

  it("updates the name of a conversation owned by the authenticated user", async () => {
    const conversation = await database.conversation.create({
      data: { userId, name: "Old name" },
    });

    const res = await request(app)
      .patch(`/api/v1/conversations/${conversation.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "  New name  " });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: "Updated successfully",
      data: { id: conversation.id, name: "New name" },
    });

    const stored = await database.conversation.findUnique({
      where: { id: conversation.id },
    });
    expect(stored?.name).toBe("New name");
  });

  it("does not reveal or update another user's conversation", async () => {
    const conversation = await database.conversation.create({
      data: { userId: otherUserId, name: "Private conversation" },
    });

    const res = await request(app)
      .patch(`/api/v1/conversations/${conversation.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Unauthorized update" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Conversation not found",
      error: { code: "NOT_FOUND" },
    });

    const stored = await database.conversation.findUnique({
      where: { id: conversation.id },
    });
    expect(stored?.name).toBe("Private conversation");
  });

  it("rejects invalid names and conversation IDs", async () => {
    const invalidName = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "   " });
    const invalidId = await request(app)
      .patch("/api/v1/conversations/not-a-uuid")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "New name" });

    expect(invalidName.status).toBe(422);
    expect(invalidName.body.error.code).toBe("VALIDATION_ERROR");
    expect(invalidId.status).toBe(422);
    expect(invalidId.body.error.details).toEqual([
      { path: "conversationId", message: expect.any(String) },
    ]);
  });
});
