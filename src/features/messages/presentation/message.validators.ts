import { z } from "zod";
import {
  MAX_MESSAGE_CONTENT_LENGTH,
  MAX_MESSAGE_MEDIA_COUNT,
} from "@/config";
import { createCursorSchema, paginationLimitSchema } from "@/core/pagination";
import { aiGenerationConfigSchema } from "@/features/ai/presentation/ai-generation.validators";
import { MediaType } from "@/features/media/domain";
import type { MessagePayload } from "../domain";

const NULL_BYTE = String.fromCharCode(0);

export const messageContentSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_MESSAGE_CONTENT_LENGTH)
  .refine((content) => !content.includes(NULL_BYTE));

const messageGenerationSchema = z.strictObject({
  type: z.enum([MediaType.IMAGE, MediaType.VIDEO]),
  config: aiGenerationConfigSchema,
});

const rawCreateMessageSchema = z
  .strictObject({
    content: messageContentSchema.optional(),
    mediaIds: z
      .array(z.uuid())
      .max(MAX_MESSAGE_MEDIA_COUNT)
      .refine((ids) => new Set(ids).size === ids.length)
      .optional(),
    generation: messageGenerationSchema.optional(),
  })
  .refine(
    (input) =>
      input.content !== undefined ||
      (input.mediaIds !== undefined && input.mediaIds.length > 0),
  )
  .refine((input) => input.generation === undefined || input.content !== undefined);

export const createMessageSchema = rawCreateMessageSchema.transform(
  (input): MessagePayload => ({
    content: input.content ?? null,
    mediaIds: input.mediaIds ?? [],
    generation: input.generation ?? null,
  }),
);

export const messageConversationParamsSchema = z.strictObject({
  conversationId: z.uuid(),
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
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
