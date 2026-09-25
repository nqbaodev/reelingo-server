import { z } from "zod";

export const updateProfileSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    avatarUrl: z
      .string()
      .trim()
      .pipe(z.url({ protocol: /^https?$/ }).max(2048))
      .nullable()
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.avatarUrl !== undefined);

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
