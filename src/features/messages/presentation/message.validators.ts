import { z } from "zod";
import { MAX_MESSAGE_CONTENT_LENGTH } from "@/config";
import { createCursorSchema, paginationLimitSchema } from "@/core/pagination";
import type { MessagePayload } from "../domain";

const NULL_BYTE = String.fromCharCode(0);

export const messageContentSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_MESSAGE_CONTENT_LENGTH)
  .refine((content) => !content.includes(NULL_BYTE));
export const createMessageSchema = z
  .strictObject({
    content: messageContentSchema.optional(),
    mediaIds: z
      .array(z.uuid())
      .min(1)
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length)
      .optional(),
  })
  .refine((input) => input.content !== undefined || input.mediaIds !== undefined)
  .transform((input): MessagePayload => ({
    content: input.content ?? null,
    mediaIds: input.mediaIds ?? [],
  }));

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
