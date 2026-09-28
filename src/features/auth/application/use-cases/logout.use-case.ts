import type { TokenClaims } from "@/services/jwt";
import type { TokenRevocationStore } from "../../infrastructure";

export class LogoutUseCase {
  constructor(private readonly revocations: TokenRevocationStore) {}

  async execute(claims: TokenClaims): Promise<void> {
    await this.revocations.revokeSession(
      claims.sessionId,
      claims.sessionExpiresAt,
    );
  }
}
