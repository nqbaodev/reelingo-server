import { z } from "zod";
import { MAX_MEDIA_DELETE_COUNT } from "@/config";

export const deleteMediaSchema = z.strictObject({
  mediaIds: z.array(z.uuid()).min(1).max(MAX_MEDIA_DELETE_COUNT),
});

export const mediaParamsSchema = z.strictObject({
  mediaId: z.uuid(),
});

export type DeleteMediaInput = z.infer<typeof deleteMediaSchema>;
export type MediaParams = z.infer<typeof mediaParamsSchema>;
