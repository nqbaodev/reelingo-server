import { NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import type { ProfileUpdate, User } from "../../domain";
import type { UserRepository } from "../../infrastructure";

export class UpdateProfileUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: number, data: ProfileUpdate): Promise<User> {
    const user = await this.users.updateProfile(userId, data);
    if (!user) {
      throw new NotFoundError(I18n.userNotFound);
    }

    return user;
  }
}
