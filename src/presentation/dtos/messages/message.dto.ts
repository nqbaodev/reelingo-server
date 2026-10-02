import { z } from "zod";
import {
  MAX_MESSAGE_ASSET_COUNT,
  MAX_MESSAGE_CONTENT_LENGTH,
} from "@/application/constants";
import { createCursorSchema, paginationLimitSchema } from "@/application/pagination";
import { containsNullByte } from "@/utils";
import {
  imageGenerationConfigSchema,
  videoGenerationConfigSchema,
} from "@/presentation/dtos/ai/ai-generation.dto";
import type { MessageChatRun } from "@/domain";
import { AssetKind } from "@/domain";
import {
  MessageTargetType,
  type CreateMessageCommand,
} from "@/application/use-cases/messages/create-message.use-case";
import type { CreateMessagePayload, Message, MessageGeneration } from "@/domain";

const messageContentSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_MESSAGE_CONTENT_LENGTH)
  .refine((content) => !containsNullByte(content));

const aiGenerationSettingsSchema = z.strictObject({
  [AssetKind.IMAGE]: imageGenerationConfigSchema.optional(),
  [AssetKind.VIDEO]: videoGenerationConfigSchema.optional(),
});

const aiContextSchema = z.strictObject({
  intentHint: z.enum([AssetKind.IMAGE, AssetKind.VIDEO]).optional(),
  generationSettings: aiGenerationSettingsSchema.optional(),
});

const messageInputShape = {
  content: messageContentSchema.optional(),
  assetIds: z
    .array(z.uuid())
    .max(MAX_MESSAGE_ASSET_COUNT)
    .refine((ids) => new Set(ids).size === ids.length)
    .optional(),
  aiContext: aiContextSchema.optional(),
};

function hasMessagePayload(input: { content?: string; assetIds?: string[] }): boolean {
  return (
    input.content !== undefined ||
    (input.assetIds !== undefined && input.assetIds.length > 0)
  );
}

function toCreateMessagePayload(input: {
  content?: string;
  assetIds?: string[];
  aiContext?: z.infer<typeof aiContextSchema>;
}): CreateMessagePayload {
  return {
    content: input.content ?? null,
    assetIds: input.assetIds ?? [],
    aiContext: {
      intentHint: input.aiContext?.intentHint ?? null,
      generationSettings: input.aiContext?.generationSettings ?? {},
    },
  };
}

const newConversationMessageSchema = z.strictObject({
  projectId: z.uuid(),
  ...messageInputShape,
  content: messageContentSchema,
});

const existingConversationMessageSchema = z
  .strictObject({
    conversationId: z.uuid(),
    ...messageInputShape,
  })
  .refine(hasMessagePayload);

export const sendMessageSchema = z
  .union([newConversationMessageSchema, existingConversationMessageSchema])
  .transform((input): CreateMessageCommand => {
    if ("projectId" in input) {
      return {
        type: MessageTargetType.NEW_CONVERSATION,
        projectId: input.projectId,
        message: {
          ...toCreateMessagePayload(input),
          content: input.content,
        },
      };
    }

    return {
      type: MessageTargetType.EXISTING_CONVERSATION,
      conversationId: input.conversationId,
      message: toCreateMessagePayload(input),
    };
  });

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

export type SendMessageRequestDto = z.infer<typeof sendMessageSchema>;
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
  assetIds: string[];
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
