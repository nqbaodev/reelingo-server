import type { Request, Response } from "express";
import { ServiceUnavailableError, UnauthorizedError } from "@/core/errors";
import { sendSuccess } from "@/core/http";
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
import { I18n } from "@/core/i18n";
import { requireAuth } from "./require-auth";

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
        throw new ServiceUnavailableError(I18n.serviceUnavailable, { params: { service: "Google Identity" }, cause: err });
      }
      throw new UnauthorizedError(I18n.invalidGoogleToken, { cause: err });
    }

    const { user, tokens } = await this.deps.loginWithGoogle.execute(identity);
    sendSuccess(res, toAuthResponse(user, tokens), I18n.signedIn);
  };

  refresh = async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken: string };
    try {
      const tokens = await this.deps.refreshSession.execute(refreshToken);
      sendSuccess(res, toTokenPairResponse(tokens), I18n.sessionRefreshed);
    } catch (err) {
      throw err instanceof TokenRevocationStoreError
        ? new ServiceUnavailableError(I18n.serviceUnavailable, { params: { service: "Session store" }, cause: err })
        : err;
    }
  };

  logout = async (req: Request, res: Response) => {
    const auth = requireAuth(req);
    try {
      await this.deps.logout.execute(auth.claims);
    } catch (err) {
      throw err instanceof TokenRevocationStoreError
        ? new ServiceUnavailableError(I18n.serviceUnavailable, { params: { service: "Session store" }, cause: err })
        : err;
    }
    sendSuccess(res, { loggedOut: true }, I18n.signedOut);
  };

  me = async (req: Request, res: Response) => {
    sendSuccess(res, toCurrentUserResponse(requireAuth(req).user));
  };
}
