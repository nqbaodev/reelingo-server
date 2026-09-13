import type { Request, Response } from "express";
import { ServiceUnavailableError, UnauthorizedError } from "@/core/errors";
import type {
  LoginWithGoogleUseCase,
  LogoutUseCase,
  RefreshSessionUseCase,
} from "../application";
import {
  type GoogleIdentityClient,
  GoogleIdentityUnavailableError,
  TokenRevocationStoreError,
} from "../infrastructure";
import {
  toAuthResponse,
  toCurrentUserResponse,
  toTokenPairResponse,
} from "./auth.presenter";

interface AuthControllerDeps {
  googleIdentity: GoogleIdentityClient;
  loginWithGoogle: LoginWithGoogleUseCase;
  refreshSession: RefreshSessionUseCase;
  logout: LogoutUseCase;
}

export class AuthController {
  constructor(private readonly deps: AuthControllerDeps) {}

  loginWithGoogle = async (req: Request, res: Response) => {
    const { idToken } = req.body as { idToken: string };

    let identity;
    try {
      identity = await this.deps.googleIdentity.verifyIdToken(idToken);
    } catch (err) {
      if (err instanceof GoogleIdentityUnavailableError) {
        throw new ServiceUnavailableError("Google identity is unavailable");
      }
      throw new UnauthorizedError("Invalid Google ID token");
    }

    const { user, tokens } = await this.deps.loginWithGoogle.execute(identity);
    res.status(200).json(toAuthResponse(user, tokens));
  };

  refresh = async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken: string };
    try {
      const tokens = await this.deps.refreshSession.execute(refreshToken);
      res.status(200).json(toTokenPairResponse(tokens));
    } catch (err) {
      throw err instanceof TokenRevocationStoreError
        ? new ServiceUnavailableError("Session store is unavailable")
        : err;
    }
  };

  logout = async (req: Request, res: Response) => {
    const auth = requireAuth(req);
    try {
      await this.deps.logout.execute(auth.claims);
    } catch (err) {
      throw err instanceof TokenRevocationStoreError
        ? new ServiceUnavailableError("Session store is unavailable")
        : err;
    }
    res.status(200).json({ loggedOut: true });
  };

  me = async (req: Request, res: Response) => {
    res.status(200).json(toCurrentUserResponse(requireAuth(req).user));
  };
}

function requireAuth(req: Request) {
  if (!req.auth) {
    throw new UnauthorizedError("Missing bearer token");
  }
  return req.auth;
}
