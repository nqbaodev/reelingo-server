import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "@/features/users/presentation/user.validators";

describe("profile update validation", () => {
  it("trims names and allows a partial update", () => {
    expect(updateProfileSchema.parse({ name: "  Bao  " })).toEqual({ name: "Bao" });
  });

  it("allows explicitly clearing the avatar without changing the name", () => {
    expect(updateProfileSchema.parse({ avatarUrl: null })).toEqual({ avatarUrl: null });
  });

  it("accepts an HTTP(S) avatar URL", () => {
    expect(updateProfileSchema.safeParse({ avatarUrl: "https://example.com/avatar.png" }).success).toBe(true);
  });

  it.each([
    {},
    { name: "   " },
    { name: "a".repeat(121) },
    { name: null },
    { avatarUrl: "not-a-url" },
    { avatarUrl: "javascript:alert(1)" },
    { avatarUrl: "ftp://example.com/avatar.png" },
    { avatarUrl: "https://example.com/" + "a".repeat(2048) },
    { name: "Bao", id: 2 },
    { name: "Bao", email: "other@example.com" },
    { name: "Bao", googleId: "another-account" },
  ])("rejects invalid or protected profile fields: %j", (body) => {
    expect(updateProfileSchema.safeParse(body).success).toBe(false);
  });
});
