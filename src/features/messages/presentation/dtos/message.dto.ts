import { z } from "zod";
import { MAX_MESSAGE_CONTENT_LENGTH, MAX_MESSAGE_MEDIA_COUNT } from "@/config";
import { createCursorSchema, paginationLimitSchema } from "@/core/pagination";
import { containsNullByte } from "@/core/utils";
import {
  imageGenerationConfigSchema,
  videoGenerationConfigSchema,
} from "@/features/ai/presentation/dtos/ai-generation.dto";
import type { MessageChatRun } from "@/features/ai/domain";
import { MediaType } from "@/features/media/domain";
import type {
  CreateMessagePayload,
  Message,
  MessageGeneration,
} from "../../domain";

export const messageContentSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_MESSAGE_CONTENT_LENGTH)
  .refine((content) => !containsNullByte(content));

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

export type CreateMessageRequestDto = z.infer<typeof createMessageSchema>;
export type MessageConversationParamsDto = z.infer<
  typeof messageConversationParamsSchema
>;
export type MessageResponseParamsDto = z.infer<typeof messageResponseParamsSchema>;
export type ListMessagesQueryDto = z.infer<typeof listMessagesQuerySchema>;

export interface MessageResponseDto {
  id: string;
  conversationId: string;
  role: Message["role"];
  content: string | null;
  mediaIds: string[];
  generation: {
    id: string;
    triggerMessageId: string;
    type: MessageGeneration["type"];
    status: MessageGeneration["status"];
    config: MessageGeneration["config"];
    resultMessageId: string | null;
  } | null;
  chatRun: Message["chatRun"];
  createdAt: string;
}

export interface MessageTurnResponseDto {
  userMessage: MessageResponseDto;
  assistantMessage: MessageResponseDto | null;
}

export interface MessageResponseStateDto {
  chatRun: MessageChatRun;
  generation: MessageGeneration | null;
  assistantMessage: MessageResponseDto | null;
}
