import { z } from "zod";

export const mediaParamsSchema = z.strictObject({
  mediaId: z.uuid(),
});

export type MediaParams = z.infer<typeof mediaParamsSchema>;
