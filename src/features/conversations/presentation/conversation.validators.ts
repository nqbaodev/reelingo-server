import { z } from "zod";
import {
  MAX_CONVERSATION_NAME_LENGTH,
  MAX_MESSAGE_CONTENT_LENGTH,
} from "@/config";
import { createCursorSchema, paginationLimitSchema } from "@/core/pagination";

export const createConversationSchema = z.strictObject({
  content: z.string().trim().min(1).max(MAX_MESSAGE_CONTENT_LENGTH),
});

export const conversationNameSchema = z.strictObject({
  name: z.string().trim().min(1).max(MAX_CONVERSATION_NAME_LENGTH),
});

export const conversationParamsSchema = z.strictObject({
  conversationId: z.uuid(),
});

const conversationCursorPayloadSchema = z.strictObject({
  updatedAt: z.iso.datetime(),
  id: z.uuid(),
});

export const listConversationsQuerySchema = z
  .strictObject({
    limit: paginationLimitSchema,
    cursor: createCursorSchema(conversationCursorPayloadSchema).optional(),
  })
  .transform(({ limit, cursor }) => ({
    limit,
    cursor: cursor
      ? {
          updatedAt: new Date(cursor.updatedAt),
          id: cursor.id,
        }
      : undefined,
  }));

export type CreateConversationBody = z.infer<typeof createConversationSchema>;
export type ConversationNameInput = z.infer<typeof conversationNameSchema>;
export type ConversationParams = z.infer<typeof conversationParamsSchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
