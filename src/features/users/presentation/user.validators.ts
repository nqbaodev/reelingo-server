import { z } from "zod";

export const updateUserSchema = z
  .object({
    email: z.string().email().transform((value) => value.trim().toLowerCase()),
    name: z.string().min(1).max(120),
  })
  .partial();

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
