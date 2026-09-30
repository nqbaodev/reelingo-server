import { z } from "zod";
import { MAX_CONVERSATION_NAME_LENGTH } from "@/config";
import { createCursorSchema, paginationLimitSchema } from "@/core/pagination";
import { containsNullByte } from "@/core/utils";

export const conversationNameSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1)
    .max(MAX_CONVERSATION_NAME_LENGTH)
    .refine((name) => !containsNullByte(name)),
});

export const conversationParamsSchema = z.strictObject({
  conversationId: z.uuid(),
});

export const projectConversationParamsSchema = z.strictObject({
  projectId: z.uuid(),
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

export type ConversationNameRequestDto = z.infer<typeof conversationNameSchema>;
export type ConversationParamsDto = z.infer<typeof conversationParamsSchema>;
export type ProjectConversationParamsDto = z.infer<
  typeof projectConversationParamsSchema
>;
export type ListConversationsQueryDto = z.infer<typeof listConversationsQuerySchema>;

export interface ConversationResponseDto {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummaryResponseDto extends ConversationResponseDto {
  lastMessageAt: string;
}
