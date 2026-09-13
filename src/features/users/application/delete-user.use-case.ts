import { NotFoundError } from "@/core/errors";
import type { UserRepository } from "../infrastructure";

export class DeleteUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.users.findById(id);
    if (!existing) {
      throw new NotFoundError(`User ${id} not found`);
    }
    await this.users.delete(id);
  }
}
