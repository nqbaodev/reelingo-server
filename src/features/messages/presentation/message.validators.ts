import { z } from "zod";
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_MESSAGE_CONTENT_LENGTH,
  MAX_MIME_TYPE_LENGTH,
} from "@/config";
import { createCursorSchema, paginationLimitSchema } from "@/core/pagination";
import { MediaType, type MessagePayload } from "../domain";

const contentSchema = z.string().trim().min(1).max(MAX_MESSAGE_CONTENT_LENGTH);
const declaredSizeSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const mediaFields = {
  url: z.url(),
};

const imageMediaSchema = z.strictObject({
  type: z.literal(MediaType.IMAGE),
  ...mediaFields,
  mimeType: z
    .string()
    .trim()
    .min(1)
    .max(MAX_MIME_TYPE_LENGTH)
    .regex(/^image\/[^\s/]+$/i),
  sizeBytes: declaredSizeSchema.max(MAX_IMAGE_SIZE_BYTES),
});

const videoMediaSchema = z.strictObject({
  type: z.literal(MediaType.VIDEO),
  ...mediaFields,
  mimeType: z
    .string()
    .trim()
    .min(1)
    .max(MAX_MIME_TYPE_LENGTH)
    .regex(/^video\/[^\s/]+$/i),
  sizeBytes: declaredSizeSchema,
  thumbnailUrl: z.url().optional(),
  duration: z.number().positive(),
});

const rawCreateMessageSchema = z
  .strictObject({
    content: contentSchema.optional(),
    media: z.discriminatedUnion("type", [imageMediaSchema, videoMediaSchema]).optional(),
  })
  .refine((input) => input.content !== undefined || input.media !== undefined);

export const createMessageSchema = rawCreateMessageSchema.transform(
  (input): MessagePayload => {
    if (!input.media) {
      if (input.content === undefined) {
        throw new Error("Validated message payload has no content or media");
      }
      return {
        content: input.content,
        media: null,
      };
    }

    const content = input.content ?? null;
    const media = {
      url: input.media.url,
      mimeType: input.media.mimeType,
    };

    return input.media.type === MediaType.IMAGE
      ? {
          content,
          media: { ...media, type: MediaType.IMAGE },
        }
      : {
          content,
          media: {
            ...media,
            type: MediaType.VIDEO,
            thumbnailUrl: input.media.thumbnailUrl ?? null,
            duration: input.media.duration,
          },
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
