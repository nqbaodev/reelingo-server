import { z } from "zod";

export const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});

export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
