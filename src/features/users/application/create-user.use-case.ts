import { ConflictError } from "@/core/errors";
import type { NewUser, User } from "../domain";
import type { UserRepository } from "../infrastructure";

export class CreateUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(input: NewUser): Promise<User> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictError(`Email ${input.email} is already in use`);
    }
    return this.users.create(input);
  }
}
