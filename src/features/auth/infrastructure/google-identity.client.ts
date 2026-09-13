import { OAuth2Client } from "google-auth-library";
import type { GoogleIdentity } from "../domain";

export class GoogleIdentityError extends Error {}
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
        );
      }
      throw new GoogleIdentityError("Invalid Google ID token");
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

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? "",
      avatarUrl: payload.picture ?? null,
    };
  }
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as NodeJS.ErrnoException).code;
  return (
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN" ||
    err.name === "FetchError"
  );
}
