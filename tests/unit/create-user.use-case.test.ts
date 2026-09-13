import { describe, expect, it } from "vitest";
import { ConflictError } from "@/core/errors";
import { CreateUserUseCase } from "@/features/users/application";
import { InMemoryUserRepository } from "../fakes/in-memory-user.repository";

describe("CreateUserUseCase", () => {
  it("creates a user when the email is not taken", async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new CreateUserUseCase(repo);

    const user = await useCase.execute({ email: "a@test.com", name: "Alice" });

    expect(user.id).toBeDefined();
    expect(user.email).toBe("a@test.com");
  });

  it("throws ConflictError when the email is already in use", async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new CreateUserUseCase(repo);
    await useCase.execute({ email: "a@test.com", name: "Alice" });

    await expect(
      useCase.execute({ email: "a@test.com", name: "Another" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
