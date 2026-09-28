import type { User } from "@/features/users/domain";
import type { UserRepository } from "@/features/users/infrastructure";
import type { JwtService, TokenPair } from "@/services/jwt";
import type { GoogleIdentity } from "../../domain";

export class LoginWithGoogleUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly jwt: JwtService,
  ) {}

  async execute(identity: GoogleIdentity): Promise<TokenPair> {
    const user = await this.resolveUser(identity);
    return this.jwt.createTokenPair(user.id, user.email);
  }

  /**
   * Google's `sub` is the only identity we match on. Login is the sole way an
   * account is created, so an unknown `sub` is always a new user.
   */
  private async resolveUser(identity: GoogleIdentity): Promise<User> {
    const existing = await this.users.findByGoogleId(identity.googleId);
    return existing ?? this.createFromGoogle(identity);
  }

  private createFromGoogle(identity: GoogleIdentity): Promise<User> {
    return this.users.create({
      email: identity.email.trim().toLowerCase(),
      displayName: identity.name,
      googleId: identity.googleId,
    });
  }
}
