export interface VerifiedGoogleIdentity {
  googleId: string;
  email: string;
  name: string;
}

export class GoogleIdentityUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export interface GoogleIdentityVerifier {
  verifyIdToken(idToken: string): Promise<VerifiedGoogleIdentity>;
}
