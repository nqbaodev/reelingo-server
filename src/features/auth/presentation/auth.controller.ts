import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { ServiceUnavailableError, UnauthorizedError } from "@/core/errors";
import { sendSuccess } from "@/core/http";
import { I18n } from "@/core/i18n";
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
import { toAuthTokensResponse } from "./auth.presenter";
import { requireAuth } from "./require-auth";
import type { GoogleLoginInput, RefreshTokenInput } from "./auth.validators";

interface AuthControllerDeps {
  googleIdentity: GoogleIdentityClient;
  loginWithGoogle: LoginWithGoogleUseCase;
  refreshSession: RefreshSessionUseCase;
  logout: LogoutUseCase;
}

export class AuthController {
  constructor(private readonly deps: AuthControllerDeps) {}

  loginWithGoogle = async (
    req: Request<ParamsDictionary, unknown, GoogleLoginInput>,
    res: Response,
  ) => {
    const { idToken } = req.body;

    let identity;
    try {
      identity = await this.deps.googleIdentity.verifyIdToken(idToken);
    } catch (err) {
      if (err instanceof GoogleIdentityUnavailableError) {
        throw new ServiceUnavailableError(I18n.serviceUnavailable, {
          params: { service: "Google Identity" },
          cause: err,
        });
      }
      throw new UnauthorizedError(I18n.invalidGoogleToken, { cause: err });
    }

    const tokens = await this.deps.loginWithGoogle.execute(identity);
    sendSuccess(res, toAuthTokensResponse(tokens), I18n.signedIn);
  };

  refresh = async (
    req: Request<ParamsDictionary, unknown, RefreshTokenInput>,
    res: Response,
  ) => {
    const { refreshToken } = req.body;
    try {
      const tokens = await this.deps.refreshSession.execute(refreshToken);
      sendSuccess(res, toAuthTokensResponse(tokens), I18n.sessionRefreshed);
    } catch (err) {
      throw err instanceof TokenRevocationStoreError
        ? new ServiceUnavailableError(I18n.serviceUnavailable, {
            params: { service: "Session store" },
            cause: err,
          })
        : err;
    }
  };

  logout = async (req: Request, res: Response) => {
    const auth = requireAuth(req);
    try {
      await this.deps.logout.execute(auth.claims);
    } catch (err) {
      throw err instanceof TokenRevocationStoreError
        ? new ServiceUnavailableError(I18n.serviceUnavailable, {
            params: { service: "Session store" },
            cause: err,
          })
        : err;
    }
    sendSuccess(res, { loggedOut: true }, I18n.signedOut);
  };
}
