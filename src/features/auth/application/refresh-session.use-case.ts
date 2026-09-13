import { UnauthorizedError } from "@/core/errors";
import type { UserRepository } from "@/features/users/infrastructure";
import { REFRESH_TOKEN_TYPE, type TokenPair } from "../domain";
import type { JwtService, TokenRevocationStore } from "../infrastructure";
import { I18n } from "@/core/i18n";

export class RefreshSessionUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly jwt: JwtService,
    private readonly revocations: TokenRevocationStore,
  ) {}

  async execute(refreshToken: string): Promise<TokenPair> {
    let claims;
    try {
      claims = this.jwt.verify(refreshToken, REFRESH_TOKEN_TYPE);
    } catch (err) {
      throw new UnauthorizedError(I18n.invalidToken, { cause: err });
    }

    if (await this.revocations.isSessionRevoked(claims.sessionId)) {
      throw new UnauthorizedError(I18n.invalidToken);
    }

    const user = await this.users.findById(claims.userId);
    if (!user) {
      throw new UnauthorizedError(I18n.userNotFound);
    }
    // A token minted before an email change must not survive it.
    if (claims.email !== user.email) {
      throw new UnauthorizedError(I18n.invalidToken);
    }

    const consumed = await this.revocations.consumeToken(
      claims.tokenId,
      claims.expiresAt,
    );
    if (!consumed) {
      throw new UnauthorizedError(I18n.invalidToken);
    }

    return this.jwt.createTokenPair(user.id, user.email, {
      id: claims.sessionId,
      expiresAt: claims.sessionExpiresAt,
    });
  }
}
