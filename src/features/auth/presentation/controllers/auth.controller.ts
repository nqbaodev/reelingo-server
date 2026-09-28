import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { ServiceUnavailableError, UnauthorizedError } from "@/core/errors";
import { sendSuccess } from "@/core/http";
import { I18n } from "@/core/i18n";
import {
  GoogleIdTokenUnavailableError,
  type GoogleIdTokenVerifier,
} from "@/services/google-identity";
import type {
  LoginWithGoogleUseCase,
  LogoutUseCase,
  RefreshSessionUseCase,
} from "../../application";
import { TokenRevocationStoreError } from "../../infrastructure";
import type {
  GoogleLoginRequestDto,
  LogoutResponseDto,
  RefreshTokenRequestDto,
} from "../dtos/auth.dto";
import { toAuthTokensResponse } from "../presenters/auth.presenter";
import { requireAuth } from "../require-auth";

interface AuthControllerDeps {
  googleIdTokenVerifier: GoogleIdTokenVerifier;
  loginWithGoogle: LoginWithGoogleUseCase;
  refreshSession: RefreshSessionUseCase;
  logout: LogoutUseCase;
}

export class AuthController {
  constructor(private readonly deps: AuthControllerDeps) {}

  loginWithGoogle = async (
    req: Request<ParamsDictionary, unknown, GoogleLoginRequestDto>,
    res: Response,
  ) => {
    const { idToken } = req.body;

    let identity;
    try {
      identity = await this.deps.googleIdTokenVerifier.verifyIdToken(idToken);
    } catch (err) {
      if (err instanceof GoogleIdTokenUnavailableError) {
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
    req: Request<ParamsDictionary, unknown, RefreshTokenRequestDto>,
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
    const response: LogoutResponseDto = { loggedOut: true };
    sendSuccess(res, response, I18n.signedOut);
  };
}
