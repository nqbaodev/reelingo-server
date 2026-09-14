export class TokenRevocationStoreError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/**
 * Contract for one-time refresh tokens and server-revoked sessions.
 */
export interface TokenRevocationStore {
  isTokenRevoked(tokenId: string): Promise<boolean>;
  /** Atomically revoke a token, returning false when it was already used. */
  consumeToken(tokenId: string, expiresAt: Date): Promise<boolean>;
  isSessionRevoked(sessionId: string): Promise<boolean>;
  revokeSession(sessionId: string, expiresAt: Date): Promise<void>;
}
