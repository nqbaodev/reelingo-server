import { z } from "zod";

export const generateTextSchema = z.object({
  prompt: z.string().trim().min(1).max(8_000),
});
