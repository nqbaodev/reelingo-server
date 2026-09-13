import { ConflictError, NotFoundError } from "@/core/errors";
import type { User, UserUpdate } from "../domain";
import type { UserRepository } from "../infrastructure";
import { I18n } from "@/core/i18n";

export class UpdateUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(id: string, data: UserUpdate): Promise<User> {
    const existing = await this.users.findById(id);
    if (!existing) {
      throw new NotFoundError(I18n.userNotFound);
    }

    if (data.email && data.email !== existing.email) {
      const emailOwner = await this.users.findByEmail(data.email);
      if (emailOwner) {
        throw new ConflictError(I18n.emailInUse, { params: { email: data.email } });
      }
    }

    return this.users.update(id, data);
  }
}
