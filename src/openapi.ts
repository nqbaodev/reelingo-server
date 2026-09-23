import { z } from "zod";
import {
  config,
  MAX_CONVERSATION_NAME_LENGTH,
  MAX_IMAGE_SIZE_BYTES,
  MAX_MEDIA_DELETE_COUNT,
  MAX_MESSAGE_CONTENT_LENGTH,
} from "@/config";
import { cursorTokenSchema, paginationLimitSchema } from "@/core/pagination";
import { endpoints } from "@/shared/http/endpoints";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/core/i18n";
import {
  MAX_AI_GENERATION_CONFIG_VALUE_LENGTH,
  MAX_AI_GENERATION_OUTPUT_COUNT,
  MIN_AI_GENERATION_OUTPUT_COUNT,
} from "@/features/ai/domain";
import {
  googleLoginSchema,
  refreshTokenSchema,
} from "@/features/auth/presentation/auth.validators";
import {
  createConversationSchema,
  conversationNameSchema,
  conversationParamsSchema,
} from "@/features/conversations/presentation/conversation.validators";
import { MessageRole } from "@/features/messages/domain";
import {
  createMessageSchema,
  messageConversationParamsSchema,
  messageResponseParamsSchema,
} from "@/features/messages/presentation/message.validators";
import {
  deleteMediaSchema,
  mediaParamsSchema,
} from "@/features/media/presentation/media.validators";
import { SUPPORTED_IMAGE_MIME_TYPES } from "@/features/media/domain";
import { MAX_USER_ID } from "@/features/users/domain";
import { updateProfileSchema } from "@/features/users/presentation/user.validators";

// Composition root for the public API contract. Requests reuse runtime validators.
function jsonSchema(schema: z.ZodType, io: "input" | "output" = "input") {
  const { $schema: _dialect, ...result } = z.toJSONSchema(schema, { io });
  return result;
}

const languageSchema = { type: "string", enum: [...SUPPORTED_LANGUAGES] };

const responseHeaders = {
  [config.http.headers.requestId]: {
    description: "Request/log correlation ID",
    schema: { type: "string" },
  },
  [config.i18n.headers.contentLanguage]: {
    description: "Selected API message language",
    schema: languageSchema,
  },
};

const languageParameters = [
  {
    name: config.i18n.headers.language,
    in: "header",
    required: false,
    description: `API message language. Overrides Accept-Language (including q weights). Falls back to ${DEFAULT_LANGUAGE}. Does not select Gemini output language.`,
    schema: languageSchema,
  },
];

const cursorPaginationParameters = [
  {
    name: "limit",
    in: "query",
    required: false,
    description: "Maximum number of items to return",
    schema: jsonSchema(paginationLimitSchema),
  },
  {
    name: "cursor",
    in: "query",
    required: false,
    description: "Opaque cursor returned by the previous page",
    schema: jsonSchema(cursorTokenSchema),
  },
];

const errorSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z.object({
    code: z.string(),
    details: z
      .array(z.object({ path: z.string(), message: z.string() }))
      .optional()
      .describe("Present on VALIDATION_ERROR: one entry per invalid field"),
  }),
});

function response(description: string, schema: z.ZodType) {
  return {
    description,
    headers: responseHeaders,
    content: { "application/json": { schema: jsonSchema(schema, "output") } },
  };
}

function success(schema: z.ZodType, description = "Success") {
  return response(
    description,
    z.object({ success: z.literal(true), message: z.string(), data: schema }),
  );
}

function errors(...statuses: number[]) {
  const descriptions: Record<number, string> = {
    400: "Malformed request",
    401: "Authentication required or invalid token",
    404: "Resource not found",
    409: "Conflict",
    413: "Request body too large",
    415: "Unsupported media type or encoding",
    422: "Validation failed",
    429: "Rate limit exceeded",
    500: "Internal server error",
    503: "Dependency unavailable",
  };
  return Object.fromEntries(
    statuses.map((status) => [
      status,
      {
        ...response(descriptions[status] ?? "Error", errorSchema),
        headers: {
          ...responseHeaders,
          ...(status === 429
            ? {
                "Retry-After": {
                  description: "Seconds until retry",
                  schema: { type: "integer" },
                },
              }
            : {}),
        },
      },
    ]),
  );
}

function requestBody(schema: z.ZodType) {
  return {
    required: true,
    content: { "application/json": { schema: jsonSchema(schema) } },
  };
}

const currentUser = z.object({
  id: z.number().int().positive().max(MAX_USER_ID),
  email: z.email(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
});
const conversation = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(MAX_CONVERSATION_NAME_LENGTH),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const conversationSummary = conversation.extend({
  lastMessageAt: z.iso.datetime(),
});
const conversationList = z.object({
  items: z.array(conversationSummary),
  nextCursor: z.string().nullable(),
});
const aiGenerationConfig = z.object({
  aspectRatio: z.string().max(MAX_AI_GENERATION_CONFIG_VALUE_LENGTH).nullable(),
  resolution: z.string().max(MAX_AI_GENERATION_CONFIG_VALUE_LENGTH).nullable(),
  quality: z.string().max(MAX_AI_GENERATION_CONFIG_VALUE_LENGTH).nullable(),
  outputCount: z
    .number()
    .int()
    .min(MIN_AI_GENERATION_OUTPUT_COUNT)
    .max(MAX_AI_GENERATION_OUTPUT_COUNT),
  enhancePrompt: z.boolean(),
});
const messageGeneration = z.object({
  id: z.uuid(),
  triggerMessageId: z.uuid(),
  type: z.enum(["image", "video"]),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  config: aiGenerationConfig,
  resultMessageId: z.uuid().nullable(),
});
const messageChatRun = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  resultMessageId: z.uuid().nullable(),
});
const message = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  role: z.enum([MessageRole.USER, MessageRole.ASSISTANT]),
  content: z.string().max(MAX_MESSAGE_CONTENT_LENGTH).nullable(),
  mediaIds: z.array(z.uuid()).max(4),
  generation: messageGeneration.nullable(),
  chatRun: messageChatRun.nullable(),
  createdAt: z.iso.datetime(),
});
const messageList = z.object({
  items: z.array(message),
  nextCursor: z.string().nullable(),
});
const messageTurn = z.object({
  userMessage: message,
  assistantMessage: message.nullable(),
});
const messageResponseState = z.object({
  chatRun: messageChatRun,
  generation: messageGeneration.nullable(),
  assistantMessage: message.nullable(),
});
const messageTurnSuccess = z.object({
  success: z.literal(true),
  message: z.string(),
  data: messageTurn,
});
const media = z.object({
  id: z.uuid(),
  type: z.literal("image"),
  path: z.string().startsWith("/"),
  url: z.url(),
  mimeType: z.enum(SUPPORTED_IMAGE_MIME_TYPES),
  createdAt: z.iso.datetime(),
});
const deletedMedia = z.object({
  deletedIds: z.array(z.uuid()),
});
const tokenPair = z.object({ accessToken: z.string(), refreshToken: z.string() });
const authErrors = errors(400, 401, 413, 415, 422, 429, 500, 503);
const protectedErrors = errors(401, 429, 500, 503);
export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Reelingo API",
    version: "1.0.0",
    description:
      "Localized API envelopes. Success: {success,message,data}; failure: {success,message,error:{code}}. Health probes are unwrapped.",
  },
  servers: [{ url: "/" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  paths: {
    [endpoints.health.liveness]: {
      get: {
        tags: ["Health"],
        operationId: "getHealth",
        summary: "Process liveness",
        security: [],
        responses: {
          200: response(
            "Process is running",
            z.object({ status: z.literal("ok"), uptime: z.number() }),
          ),
        },
      },
    },
    [endpoints.health.readiness]: {
      get: {
        tags: ["Health"],
        operationId: "getReadiness",
        summary: "PostgreSQL readiness",
        security: [],
        responses: {
          200: response(
            "Database reachable",
            z.object({ status: z.literal("ok"), database: z.literal("ok") }),
          ),
          503: response(
            "Database unavailable",
            z.object({
              status: z.literal("unavailable"),
              database: z.literal("unreachable"),
            }),
          ),
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.auth.googleLogin}`]: {
      post: {
        tags: ["Auth"],
        operationId: "loginWithGoogle",
        summary: "Exchange Google ID token for a session",
        security: [],
        parameters: languageParameters,
        requestBody: requestBody(googleLoginSchema),
        responses: {
          200: success(tokenPair),
          ...authErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.auth.refresh}`]: {
      post: {
        tags: ["Auth"],
        operationId: "refreshSession",
        summary: "Rotate a refresh token",
        security: [],
        parameters: languageParameters,
        requestBody: requestBody(refreshTokenSchema),
        responses: { 200: success(tokenPair), ...authErrors },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.auth.logout}`]: {
      post: {
        tags: ["Auth"],
        operationId: "logout",
        summary: "Revoke the current session",
        parameters: languageParameters,
        responses: {
          200: success(z.object({ loggedOut: z.literal(true) })),
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.users.me}`]: {
      patch: {
        tags: ["Users"],
        operationId: "updateCurrentUserProfile",
        summary: "Update the current user's name or avatar",
        description:
          "At least one field is required. Omitted fields stay unchanged; avatarUrl: null clears the avatar. Only name and avatarUrl are accepted.",
        parameters: languageParameters,
        requestBody: requestBody(updateProfileSchema),
        responses: {
          200: success(currentUser),
          ...errors(400, 404, 413, 415, 422),
          ...protectedErrors,
        },
      },
      get: {
        tags: ["Users"],
        operationId: "getCurrentUser",
        summary: "Get the current user",
        parameters: languageParameters,
        responses: { 200: success(currentUser), ...protectedErrors },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.conversations.root}`]: {
      get: {
        tags: ["Conversations"],
        operationId: "listConversations",
        summary: "List conversations for infinite scrolling",
        parameters: [...languageParameters, ...cursorPaginationParameters],
        responses: {
          200: success(conversationList),
          ...errors(422),
          ...protectedErrors,
        },
      },
      post: {
        tags: ["Conversations"],
        operationId: "createConversation",
        summary: "Create a conversation from the first message",
        description:
          "Creates the conversation and its first user text message atomically. The initial name is derived from the first 120 characters of content.",
        parameters: languageParameters,
        requestBody: requestBody(createConversationSchema),
        responses: {
          201: success(conversation, "Conversation created"),
          ...errors(400, 413, 415, 422),
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.conversations.byId}`.replace(
      ":conversationId",
      "{conversationId}",
    )]: {
      patch: {
        tags: ["Conversations"],
        operationId: "updateConversationName",
        summary: "Update a conversation name",
        parameters: [
          ...languageParameters,
          {
            name: "conversationId",
            in: "path",
            required: true,
            schema: jsonSchema(conversationParamsSchema.shape.conversationId),
          },
        ],
        requestBody: requestBody(conversationNameSchema),
        responses: {
          200: success(conversation, "Conversation updated"),
          ...errors(400, 404, 413, 415, 422),
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.messages.events}`]: {
      get: {
        tags: ["Messages"],
        operationId: "subscribeMessageEvents",
        summary: "Subscribe to background message events",
        description:
          "Opens an authenticated SSE stream for background AI generation completion and failure events. Events are not replayed; reload recovery uses the persisted message list and response status endpoints.",
        parameters: languageParameters,
        responses: {
          200: {
            description: "Background message event stream",
            headers: responseHeaders,
            content: {
              "text/event-stream": {
                schema: { type: "string" },
                example:
                  'event: stream.connected\ndata: {"v":1}\n\nevent: generation.completed\ndata: {"v":1,"generationId":"f8a81760-c5fe-4aad-b040-15dbf72ffde8","message":{}}\n\n',
              },
            },
          },
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.messages.byConversation}`.replace(
      ":conversationId",
      "{conversationId}",
    )]: {
      get: {
        tags: ["Messages"],
        operationId: "listMessages",
        summary: "List messages for infinite scrolling",
        description: "Messages are ordered from newest to oldest.",
        parameters: [
          ...languageParameters,
          ...cursorPaginationParameters,
          {
            name: "conversationId",
            in: "path",
            required: true,
            schema: jsonSchema(messageConversationParamsSchema.shape.conversationId),
          },
        ],
        responses: {
          200: success(messageList),
          ...errors(404, 422),
          ...protectedErrors,
        },
      },
      post: {
        tags: ["Messages"],
        operationId: "sendMessage",
        summary: "Send a message to the AI conversation",
        description:
          "Persists the user message and a pending chat run, then returns immediately. Optional aiContext carries a session preference and generation settings; it is not an explicit mode. Call the message response endpoint to run Gemini.",
        parameters: [
          ...languageParameters,
          {
            name: "conversationId",
            in: "path",
            required: true,
            schema: jsonSchema(messageConversationParamsSchema.shape.conversationId),
          },
        ],
        requestBody: requestBody(createMessageSchema),
        responses: {
          201: success(message, "Message accepted for AI processing"),
          ...errors(400, 404, 413, 415, 422),
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.messages.response}`
      .replace(":conversationId", "{conversationId}")
      .replace(":messageId", "{messageId}")]: {
      get: {
        tags: ["Messages"],
        operationId: "getMessageResponse",
        summary: "Read the assistant response status for a message",
        description:
          "Polling endpoint for a persisted chat run. A queued media generation keeps assistantMessage null until its worker creates the final message. This request never starts or retries AI processing.",
        parameters: [
          ...languageParameters,
          {
            name: "conversationId",
            in: "path",
            required: true,
            schema: jsonSchema(messageResponseParamsSchema.shape.conversationId),
          },
          {
            name: "messageId",
            in: "path",
            required: true,
            schema: jsonSchema(messageResponseParamsSchema.shape.messageId),
          },
        ],
        responses: {
          200: success(messageResponseState, "Assistant response status"),
          ...errors(404, 422),
          ...protectedErrors,
        },
      },
      post: {
        tags: ["Messages"],
        operationId: "respondToMessage",
        summary: "Generate the assistant response for a message",
        description:
          "Claims the pending chat run, calls Gemini, and persists either an assistant reply or a media-generation request. A generation response has assistantMessage null until the background worker finishes. Send Accept: text/event-stream to receive chat.started, assistant.delta, generation.queued, chat.completed, or chat.failed events. Without that explicit media type, the response remains JSON. Repeating a completed request returns the existing state.",
        parameters: [
          ...languageParameters,
          {
            name: "Accept",
            in: "header",
            required: false,
            description:
              "Use text/event-stream for a streamed response. Defaults to application/json.",
            schema: { type: "string" },
          },
          {
            name: "conversationId",
            in: "path",
            required: true,
            schema: jsonSchema(messageResponseParamsSchema.shape.conversationId),
          },
          {
            name: "messageId",
            in: "path",
            required: true,
            schema: jsonSchema(messageResponseParamsSchema.shape.messageId),
          },
        ],
        responses: {
          200: {
            description: "Assistant response persisted or streamed",
            headers: responseHeaders,
            content: {
              "application/json": {
                schema: jsonSchema(messageTurnSuccess, "output"),
              },
              "text/event-stream": {
                schema: { type: "string" },
                example:
                  'event: chat.started\ndata: {"v":1,"runId":"f8a81760-c5fe-4aad-b040-15dbf72ffde8"}\n\nevent: assistant.delta\ndata: {"v":1,"delta":"Hello"}\n\nevent: chat.completed\ndata: {"v":1,"userMessage":{},"assistantMessage":{}}\n\n',
              },
            },
          },
          ...errors(404, 409, 422),
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.media.upload}`]: {
      post: {
        tags: ["Media"],
        operationId: "uploadImage",
        summary: "Upload one image",
        description: `Accepts one JPEG, PNG, or WebP image in the file field. The actual file signature is inspected and the image is limited to ${MAX_IMAGE_SIZE_BYTES} bytes.`,
        parameters: languageParameters,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                  },
                },
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          201: success(media, "Media uploaded"),
          ...errors(400, 413, 415, 422),
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.media.delete}`]: {
      post: {
        tags: ["Media"],
        operationId: "deleteMedia",
        summary: "Delete unattached uploaded media",
        description: `Deletes up to ${MAX_MEDIA_DELETE_COUNT} owned media items that are not attached to a message. Non-owned, missing, duplicate, and already attached media IDs are skipped; the response only contains IDs that were deleted.`,
        parameters: languageParameters,
        requestBody: requestBody(deleteMediaSchema),
        responses: {
          200: success(deletedMedia, "Media deleted"),
          ...errors(400, 413, 415, 422),
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.media.byId}`.replace(":mediaId", "{mediaId}")]: {
      get: {
        tags: ["Media"],
        operationId: "getMedia",
        summary: "Get owned media content",
        parameters: [
          ...languageParameters,
          {
            name: "mediaId",
            in: "path",
            required: true,
            schema: jsonSchema(mediaParamsSchema.shape.mediaId),
          },
        ],
        responses: {
          200: {
            description: "Image bytes",
            headers: responseHeaders,
            content: {
              "image/jpeg": { schema: { type: "string", format: "binary" } },
              "image/png": { schema: { type: "string", format: "binary" } },
              "image/webp": { schema: { type: "string", format: "binary" } },
              "video/mp4": { schema: { type: "string", format: "binary" } },
              "video/webm": { schema: { type: "string", format: "binary" } },
            },
          },
          ...errors(404, 422),
          ...protectedErrors,
        },
      },
    },
  },
};
