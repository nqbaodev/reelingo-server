import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { ServiceUnavailableError, UnauthorizedError } from "@/application/errors";
import { sendSuccess } from "@/presentation/http";
import { I18n } from "@/application/i18n";
import {
  GoogleIdentityUnavailableError,
  type GoogleIdentityVerifier,
} from "@/application/interfaces/identity/google-identity.types";
import type {
  LoginWithGoogleUseCase,
  LogoutUseCase,
  RefreshSessionUseCase,
} from "@/application/use-cases/auth";
import { TokenRevocationStoreError } from "@/application/interfaces/auth/token-revocation.store";
import type {
  GoogleLoginRequestDto,
  LogoutResponseDto,
  RefreshTokenRequestDto,
} from "@/presentation/dtos/auth/auth.dto";
import { toAuthTokensResponse } from "@/presentation/presenters/auth/auth.presenter";
import { requireAuth } from "@/presentation/middlewares/auth/require-auth";

interface AuthControllerDeps {
  googleIdTokenVerifier: GoogleIdentityVerifier;
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
