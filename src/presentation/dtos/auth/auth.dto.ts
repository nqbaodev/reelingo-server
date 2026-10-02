import { z } from "zod";

export const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});

export type GoogleLoginRequestDto = z.infer<typeof googleLoginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenRequestDto = z.infer<typeof refreshTokenSchema>;

export interface AuthTokensResponseDto {
  accessToken: string;
  refreshToken: string;
}

export interface LogoutResponseDto {
  loggedOut: true;
}
