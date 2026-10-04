import { z } from "zod";
import {
  MAX_MESSAGE_ASSET_COUNT,
  MAX_MESSAGE_CONTENT_LENGTH,
} from "@/application/constants";
import { createCursorSchema, paginationLimitSchema } from "@/application/pagination";
import { unixTimestampMillisecondsSchema } from "@/presentation/http";
import { containsNullByte } from "@/utils";
import {
  imageGenerationConfigRequestSchema,
  imageGenerationConfigResponseSchema,
  imageGenerationConfigSchema,
  videoGenerationConfigRequestSchema,
  videoGenerationConfigResponseSchema,
  videoGenerationConfigSchema,
} from "@/presentation/dtos/ai/ai-generation.dto";
import { AiGenerationStatus, AssetKind, ChatRunStatus, MessageRole } from "@/domain";
import {
  MessageTargetType,
  type CreateMessageCommand,
} from "@/application/use-cases/messages/create-message.use-case";
import type { CreateMessagePayload } from "@/domain";

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

const aiContextRequestSchema = z.strictObject({
  intentHint: z.enum([AssetKind.IMAGE, AssetKind.VIDEO]).optional(),
  generationSettings: z
    .strictObject({
      [AssetKind.IMAGE]: imageGenerationConfigRequestSchema.optional(),
      [AssetKind.VIDEO]: videoGenerationConfigRequestSchema.optional(),
    })
    .optional(),
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

export const sendMessageRequestSchema = z.union([
  z.strictObject({
    projectId: z.uuid(),
    content: messageContentSchema,
    assetIds: messageInputShape.assetIds,
    aiContext: aiContextRequestSchema.optional(),
  }),
  z
    .strictObject({
      conversationId: z.uuid(),
      content: messageInputShape.content,
      assetIds: messageInputShape.assetIds,
      aiContext: aiContextRequestSchema.optional(),
    })
    .refine(hasMessagePayload),
]);

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

const generationResponseBase = {
  id: z.uuid(),
  triggerMessageId: z.uuid(),
  status: z.enum(AiGenerationStatus),
  resultMessageId: z.uuid().nullable(),
};

export const messageGenerationResponseSchema = z.discriminatedUnion("type", [
  z.object({
    ...generationResponseBase,
    type: z.literal(AssetKind.IMAGE),
    config: imageGenerationConfigResponseSchema,
  }),
  z.object({
    ...generationResponseBase,
    type: z.literal(AssetKind.VIDEO),
    config: videoGenerationConfigResponseSchema,
  }),
]);

export const aiSessionResponseSchema = z.object({
  id: z.uuid(),
  status: z.enum(ChatRunStatus),
  resultMessageId: z.uuid().nullable(),
});

export const messageResponseSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  role: z.enum(MessageRole),
  content: z.string().max(MAX_MESSAGE_CONTENT_LENGTH).nullable(),
  assetIds: z.array(z.uuid()).max(MAX_MESSAGE_ASSET_COUNT),
  generation: messageGenerationResponseSchema.nullable(),
  session: aiSessionResponseSchema.nullable(),
  createdAt: unixTimestampMillisecondsSchema,
});

export const messageTurnResponseSchema = z.object({
  userMessage: messageResponseSchema,
  assistantMessage: messageResponseSchema.nullable(),
});

export const messageResponseStateSchema = z.object({
  session: aiSessionResponseSchema,
  generation: messageGenerationResponseSchema.nullable(),
  assistantMessage: messageResponseSchema.nullable(),
});

export type AiSessionResponseDto = z.infer<typeof aiSessionResponseSchema>;
export type MessageGenerationResponseDto = z.infer<
  typeof messageGenerationResponseSchema
>;
export type MessageResponseDto = z.infer<typeof messageResponseSchema>;
export type MessageTurnResponseDto = z.infer<typeof messageTurnResponseSchema>;
export type MessageResponseStateDto = z.infer<typeof messageResponseStateSchema>;
