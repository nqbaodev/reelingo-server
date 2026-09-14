import { OAuth2Client } from "google-auth-library";
import { isNetworkError } from "@/core/utils";
import type { GoogleIdentity } from "../domain";
import { toEntity } from "./google-identity.mapper";

export class GoogleIdentityError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}
export class GoogleIdentityUnavailableError extends GoogleIdentityError {}

export class GoogleIdentityClient {
  private readonly client: OAuth2Client;

  constructor(private readonly clientId: string) {
    this.client = new OAuth2Client(clientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
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
        throw new GoogleIdentityUnavailableError(
          "Google identity service is unavailable",
          { cause: err },
        );
      }
      throw new GoogleIdentityError("Invalid Google ID token", { cause: err });
    }

    if (!payload) {
      throw new GoogleIdentityError("Google token payload is empty");
    }
    if (!payload.email_verified) {
      throw new GoogleIdentityError("Google email is not verified");
    }
    if (!payload.sub || !payload.email) {
      throw new GoogleIdentityError("Google token is missing required claims");
    }

    return toEntity({ ...payload, email: payload.email });
  }
}
