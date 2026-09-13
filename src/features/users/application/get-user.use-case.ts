import { NotFoundError } from "@/core/errors";
import type { User } from "../domain";
import type { UserRepository } from "../infrastructure";
import { I18n } from "@/core/i18n";

export class GetUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundError(I18n.userNotFound);
    }
    return user;
  }
}
