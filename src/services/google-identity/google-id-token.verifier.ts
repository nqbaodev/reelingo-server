import { OAuth2Client } from "google-auth-library";
import { isNetworkError } from "@/core/utils";
import type { VerifiedGoogleIdentity } from "./google-identity.types";

class GoogleIdTokenError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}
export class GoogleIdTokenUnavailableError extends GoogleIdTokenError {}

export class GoogleIdTokenVerifier {
  private readonly client: OAuth2Client;

  constructor(private readonly clientId: string) {
    this.client = new OAuth2Client({ clientId });
  }

  async verifyIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch (err) {
      // A network failure while fetching Google's signing keys is not the
      // caller's fault, so it must not be reported as an invalid token.
      if (isNetworkError(err)) {
        throw new GoogleIdTokenUnavailableError(
          "Google identity service is unavailable",
          { cause: err },
        );
      }
      throw new GoogleIdTokenError("Invalid Google ID token", { cause: err });
    }

    if (!payload) {
      throw new GoogleIdTokenError("Google token payload is empty");
    }
    if (!payload.email_verified) {
      throw new GoogleIdTokenError("Google email is not verified");
    }
    if (!payload.sub || !payload.email) {
      throw new GoogleIdTokenError("Google token is missing required claims");
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? "",
    };
  }
}
