import { ConflictError, NotFoundError } from "@/core/errors";
import type { User, UserUpdate } from "../domain";
import type { UserRepository } from "../infrastructure";

export class UpdateUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(id: string, data: UserUpdate): Promise<User> {
    const existing = await this.users.findById(id);
    if (!existing) {
      throw new NotFoundError(`User ${id} not found`);
    }

    if (data.email && data.email !== existing.email) {
      const emailOwner = await this.users.findByEmail(data.email);
      if (emailOwner) {
        throw new ConflictError(`Email ${data.email} is already in use`);
      }
    }

    return this.users.update(id, data);
  }
}
