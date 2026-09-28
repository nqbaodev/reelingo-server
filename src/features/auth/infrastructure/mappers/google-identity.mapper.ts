import type { TokenPayload } from "google-auth-library";
import type { GoogleIdentity } from "../../domain";

type VerifiedGooglePayload = Pick<TokenPayload, "sub" | "name"> & {
  email: string;
};

export function toEntity(payload: VerifiedGooglePayload): GoogleIdentity {
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? "",
  };
}
