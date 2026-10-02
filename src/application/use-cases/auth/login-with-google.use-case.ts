import type { User } from "@/domain";
import type { UserRepository } from "@/application/interfaces/repositories/user.repository";
import type { VerifiedGoogleIdentity } from "@/application/interfaces/identity/google-identity.types";
import type { TokenPair, TokenService } from "@/application/interfaces/security/token";

export class LoginWithGoogleUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly jwt: TokenService,
  ) {}

  async execute(identity: VerifiedGoogleIdentity): Promise<TokenPair> {
    const user = await this.resolveUser(identity);
    return this.jwt.createTokenPair(user.id, user.email);
  }

  /**
   * Google's `sub` is the only identity we match on. Login is the sole way an
   * account is created, so an unknown `sub` is always a new user.
   */
  private async resolveUser(identity: VerifiedGoogleIdentity): Promise<User> {
    const existing = await this.users.findByGoogleId(identity.googleId);
    return existing ?? this.createFromGoogle(identity);
  }

  private createFromGoogle(identity: VerifiedGoogleIdentity): Promise<User> {
    return this.users.create({
      email: identity.email.trim().toLowerCase(),
      displayName: identity.name,
      googleId: identity.googleId,
    });
  }
}
