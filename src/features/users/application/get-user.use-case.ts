import { NotFoundError } from "@/core/errors";
import type { User } from "../domain";
import type { UserRepository } from "../infrastructure";

export class GetUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundError(`User ${id} not found`);
    }
    return user;
  }
}
