import type { TokenClaims } from "@/application/interfaces/security/token";
import type { TokenRevocationStore } from "@/application/interfaces/auth/token-revocation.store";

export class LogoutUseCase {
  constructor(private readonly revocations: TokenRevocationStore) {}

  async execute(claims: TokenClaims): Promise<void> {
    await this.revocations.revokeSession(claims.sessionId, claims.sessionExpiresAt);
  }
}
