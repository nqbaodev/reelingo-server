import { z } from "zod";

export const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});

export type GoogleLoginRequestDto = z.infer<typeof googleLoginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenRequestDto = z.infer<typeof refreshTokenSchema>;

export const authTokensResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const logoutResponseSchema = z.object({ loggedOut: z.literal(true) });

export type AuthTokensResponseDto = z.infer<typeof authTokensResponseSchema>;
export type LogoutResponseDto = z.infer<typeof logoutResponseSchema>;
