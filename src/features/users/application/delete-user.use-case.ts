import { NotFoundError } from "@/core/errors";
import type { UserRepository } from "../infrastructure";
import { I18n } from "@/core/i18n";

export class DeleteUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.users.findById(id);
    if (!existing) {
      throw new NotFoundError(I18n.userNotFound);
    }
    await this.users.delete(id);
  }
}
