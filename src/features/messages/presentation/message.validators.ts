import { z } from "zod";
import { MAX_MESSAGE_CONTENT_LENGTH, MAX_MESSAGE_MEDIA_COUNT } from "@/config";
import { createCursorSchema, paginationLimitSchema } from "@/core/pagination";
import {
  imageGenerationConfigSchema,
  videoGenerationConfigSchema,
} from "@/features/ai/presentation/ai-generation.validators";
import { MediaType } from "@/features/media/domain";
import type { CreateMessagePayload } from "../domain";

const NULL_BYTE = String.fromCharCode(0);

export const messageContentSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_MESSAGE_CONTENT_LENGTH)
  .refine((content) => !content.includes(NULL_BYTE));

const aiGenerationSettingsSchema = z.strictObject({
  [MediaType.IMAGE]: imageGenerationConfigSchema.optional(),
  [MediaType.VIDEO]: videoGenerationConfigSchema.optional(),
});

const aiContextSchema = z.strictObject({
  intentHint: z.enum([MediaType.IMAGE, MediaType.VIDEO]).optional(),
  generationSettings: aiGenerationSettingsSchema.optional(),
});

const rawCreateMessageSchema = z
  .strictObject({
    content: messageContentSchema.optional(),
    mediaIds: z
      .array(z.uuid())
      .max(MAX_MESSAGE_MEDIA_COUNT)
      .refine((ids) => new Set(ids).size === ids.length)
      .optional(),
    aiContext: aiContextSchema.optional(),
  })
  .refine(
    (input) =>
      input.content !== undefined ||
      (input.mediaIds !== undefined && input.mediaIds.length > 0),
  );

export const createMessageSchema = rawCreateMessageSchema.transform(
  (input): CreateMessagePayload => ({
    content: input.content ?? null,
    mediaIds: input.mediaIds ?? [],
    aiContext: {
      intentHint: input.aiContext?.intentHint ?? null,
      generationSettings: input.aiContext?.generationSettings ?? {},
    },
  }),
);

export const messageConversationParamsSchema = z.strictObject({
  conversationId: z.uuid(),
});

export const messageResponseParamsSchema = z.strictObject({
  conversationId: z.uuid(),
  messageId: z.uuid(),
});

const messageCursorPayloadSchema = z.strictObject({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});

export const listMessagesQuerySchema = z
  .strictObject({
    limit: paginationLimitSchema,
    cursor: createCursorSchema(messageCursorPayloadSchema).optional(),
  })
  .transform(({ limit, cursor }) => ({
    limit,
    cursor: cursor
      ? {
          createdAt: new Date(cursor.createdAt),
          id: cursor.id,
        }
      : undefined,
  }));

export type CreateMessageBody = z.infer<typeof createMessageSchema>;
export type MessageConversationParams = z.infer<typeof messageConversationParamsSchema>;
export type MessageResponseParams = z.infer<typeof messageResponseParamsSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
