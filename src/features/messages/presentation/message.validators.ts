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
const rawCreateMessageSchema = z
  .strictObject({
    content: messageContentSchema.optional(),
    mediaId: z.uuid().optional(),
  })
  .refine((input) => input.content !== undefined || input.mediaId !== undefined);

export const createMessageSchema = rawCreateMessageSchema.transform(
  (input): MessagePayload => {
    if (!input.mediaId) {
      if (input.content === undefined) {
        throw new Error("Validated message payload has no content or mediaId");
      }
      return {
        content: input.content,
        mediaId: null,
      };
    }

    return {
      content: input.content ?? null,
      mediaId: input.mediaId,
    };
  },
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
