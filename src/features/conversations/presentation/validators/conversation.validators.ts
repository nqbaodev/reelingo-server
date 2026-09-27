import { z } from "zod";
import { MAX_CONVERSATION_NAME_LENGTH } from "@/config";
import { createCursorSchema, paginationLimitSchema } from "@/core/pagination";
import { messageContentSchema } from "@/features/messages/presentation/validators/message.validators";

const NULL_BYTE = String.fromCharCode(0);

export const createConversationSchema = z.strictObject({
  content: messageContentSchema,
});

export const conversationNameSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1)
    .max(MAX_CONVERSATION_NAME_LENGTH)
    .refine((name) => !name.includes(NULL_BYTE)),
});

export const conversationParamsSchema = z.strictObject({
  conversationId: z.uuid(),
});

const conversationCursorPayloadSchema = z.strictObject({
  lastMessageAt: z.iso.datetime(),
  conversationId: z.uuid(),
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
          lastMessageAt: new Date(cursor.lastMessageAt),
          conversationId: cursor.conversationId,
        }
      : undefined,
  }));

export type CreateConversationBody = z.infer<typeof createConversationSchema>;
export type ConversationNameInput = z.infer<typeof conversationNameSchema>;
export type ConversationParams = z.infer<typeof conversationParamsSchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
