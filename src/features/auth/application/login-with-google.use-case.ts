import type { User } from "@/features/users/domain";
import type { UserRepository } from "@/features/users/infrastructure";
import type { GoogleIdentity, TokenPair } from "../domain";
import type { JwtService } from "../infrastructure";

export class LoginWithGoogleUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly jwt: JwtService,
  ) {}

  async execute(
    identity: GoogleIdentity,
  ): Promise<{ user: User; tokens: TokenPair }> {
    const email = identity.email.trim().toLowerCase();
    const existing = await this.users.findByGoogleId(identity.googleId);

    const user = existing
      ? await this.users.update(existing.id, {
          email,
          name: identity.name,
          avatarUrl: identity.avatarUrl,
        })
      : await this.linkOrCreate(identity, email);

    return { user, tokens: this.jwt.createTokenPair(user.id, user.email) };
  }

  /**
   * A user may already exist from the users CRUD feature without a Google
   * identity; the first Google login adopts that row instead of failing on
   * the unique email constraint.
   */
  private async linkOrCreate(
    identity: GoogleIdentity,
    email: string,
  ): Promise<User> {
    const byEmail = await this.users.findByEmail(email);
    if (byEmail) {
      return this.users.update(byEmail.id, {
        name: identity.name,
        googleId: identity.googleId,
        avatarUrl: identity.avatarUrl,
      });
    }

    return this.users.create({
      email,
      name: identity.name,
      googleId: identity.googleId,
      avatarUrl: identity.avatarUrl,
    });
  }
}
