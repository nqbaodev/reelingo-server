import { z } from "zod";
import {
  MAX_ASSET_DELETE_COUNT,
  MAX_CONVERSATION_NAME_LENGTH,
  MAX_IMAGE_SIZE_BYTES,
  MAX_MESSAGE_ASSET_COUNT,
  MAX_MESSAGE_CONTENT_LENGTH,
  MAX_POSTGRES_INTEGER,
  MAX_PROJECT_TITLE_LENGTH,
} from "@/application/constants";
import { config } from "@/config";
import { cursorTokenSchema, paginationLimitSchema } from "@/application/pagination";
import { DATE_ONLY_FORMAT } from "@/utils";
import { endpoints } from "@/presentation/http/endpoints";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/application/i18n";
import {
  IMAGE_GENERATION_ASPECT_RATIOS,
  IMAGE_GENERATION_RESOLUTIONS,
  MAX_AI_GENERATION_OUTPUT_COUNT,
  MIN_AI_GENERATION_OUTPUT_COUNT,
  VIDEO_GENERATION_ASPECT_RATIOS,
  VIDEO_GENERATION_RESOLUTIONS,
} from "@/domain";
import { googleLoginSchema, refreshTokenSchema } from "@/presentation/dtos/auth/auth.dto";
import {
  conversationNameSchema,
  conversationParamsSchema,
  projectConversationParamsSchema,
} from "@/presentation/dtos/conversations/conversation.dto";
import { MessageRole } from "@/domain";
import {
  messageConversationParamsSchema,
  messageResponseParamsSchema,
  sendMessageSchema,
} from "@/presentation/dtos/messages/message.dto";
import {
  assetKindSchema,
  assetParamsSchema,
  deleteAssetsSchema,
} from "@/presentation/dtos/assets/asset.dto";
import {
  projectParamsSchema,
  projectTitleSchema,
} from "@/presentation/dtos/projects/project.dto";
import {
  avatarUrlSchema,
  birthDateSchema,
  countryCodeSchema,
  displayNameSchema,
  phoneNumberSchema,
  updateProfileSchema,
} from "@/presentation/dtos/users/user.dto";

// Composition root for the public API contract. Requests reuse runtime DTO schemas.
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
    406: "Requested response representation is not available",
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
  id: z.number().int().positive().max(MAX_POSTGRES_INTEGER),
  email: z.email(),
  displayName: displayNameSchema,
  avatarUrl: avatarUrlSchema.nullable(),
  countryCode: countryCodeSchema.nullable(),
  phoneNumber: phoneNumberSchema.nullable(),
  birthDate: birthDateSchema.nullable(),
});
const project = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(MAX_PROJECT_TITLE_LENGTH),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const projectList = z.object({
  items: z.array(project),
  nextCursor: z.string().nullable(),
});
const conversation = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
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
const imageGenerationConfig = z.object({
  aspectRatio: z.enum(IMAGE_GENERATION_ASPECT_RATIOS).nullable(),
  resolution: z.enum(IMAGE_GENERATION_RESOLUTIONS).nullable(),
  outputCount: z
    .number()
    .int()
    .min(MIN_AI_GENERATION_OUTPUT_COUNT)
    .max(MAX_AI_GENERATION_OUTPUT_COUNT),
  enhancePrompt: z.literal(false),
});
const videoGenerationConfig = z.object({
  aspectRatio: z.enum(VIDEO_GENERATION_ASPECT_RATIOS).nullable(),
  resolution: z.enum(VIDEO_GENERATION_RESOLUTIONS).nullable(),
  outputCount: z.literal(1),
  enhancePrompt: z.boolean(),
});
const generationBase = {
  id: z.uuid(),
  triggerMessageId: z.uuid(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  resultMessageId: z.uuid().nullable(),
};
const messageGeneration = z.discriminatedUnion("type", [
  z.object({
    ...generationBase,
    type: z.literal("image"),
    config: imageGenerationConfig,
  }),
  z.object({
    ...generationBase,
    type: z.literal("video"),
    config: videoGenerationConfig,
  }),
]);
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
  assetIds: z.array(z.uuid()).max(MAX_MESSAGE_ASSET_COUNT),
  generation: messageGeneration.nullable(),
  chatRun: messageChatRun.nullable(),
  createdAt: z.iso.datetime(),
});
const messageList = z.object({
  items: z.array(message),
  nextCursor: z.string().nullable(),
});
const messageResponseState = z.object({
  chatRun: messageChatRun,
  generation: messageGeneration.nullable(),
  assistantMessage: message.nullable(),
});
const asset = z.object({
  id: z.uuid(),
  kind: z.enum(["image", "video"]),
  path: z.string().startsWith("/"),
  url: z.url(),
  mimeType: z.string().min(1),
  createdAt: z.iso.datetime(),
});
const assetList = z.object({
  items: z.array(asset),
  nextCursor: z.string().nullable(),
});
const deletedAssets = z.object({
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
      get: {
        tags: ["Users"],
        operationId: "getCurrentUser",
        summary: "Get the current user",
        parameters: languageParameters,
        responses: { 200: success(currentUser), ...protectedErrors },
      },
      put: {
        tags: ["Users"],
        operationId: "updateCurrentUserProfile",
        summary: "Update the current user's profile",
        description: `Replaces all editable profile fields. Every field is required; nullable fields can be cleared with null. countryCode contains 1-3 calling-code digits without '+'. phoneNumber contains 4-15 national-number digits without spaces, country code, or '+'. birthDate uses ${DATE_ONLY_FORMAT}. Phone data is user-provided and unverified.`,
        parameters: languageParameters,
        requestBody: requestBody(updateProfileSchema),
        responses: {
          200: success(currentUser),
          ...errors(400, 404, 413, 415, 422),
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.projects.root}`]: {
      get: {
        tags: ["Projects"],
        operationId: "listProjects",
        summary: "List owned projects for infinite scrolling",
        parameters: [...languageParameters, ...cursorPaginationParameters],
        responses: {
          200: success(projectList),
          ...errors(422),
          ...protectedErrors,
        },
      },
      post: {
        tags: ["Projects"],
        operationId: "createProject",
        summary: "Create a project",
        parameters: languageParameters,
        requestBody: requestBody(projectTitleSchema),
        responses: {
          201: success(project, "Project created"),
          ...errors(400, 413, 415, 422),
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.projects.byId}`.replace(
      ":projectId",
      "{projectId}",
    )]: {
      get: {
        tags: ["Projects"],
        operationId: "getProject",
        summary: "Get an owned project",
        parameters: [
          ...languageParameters,
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: jsonSchema(projectParamsSchema.shape.projectId),
          },
        ],
        responses: {
          200: success(project),
          ...errors(404, 422),
          ...protectedErrors,
        },
      },
      patch: {
        tags: ["Projects"],
        operationId: "updateProjectTitle",
        summary: "Rename an owned project",
        parameters: [
          ...languageParameters,
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: jsonSchema(projectParamsSchema.shape.projectId),
          },
        ],
        requestBody: requestBody(projectTitleSchema),
        responses: {
          200: success(project, "Project updated"),
          ...errors(400, 404, 413, 415, 422),
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.projects.conversations}`.replace(
      ":projectId",
      "{projectId}",
    )]: {
      get: {
        tags: ["Conversations"],
        operationId: "listProjectConversations",
        summary: "List conversations in an owned project",
        parameters: [
          ...languageParameters,
          ...cursorPaginationParameters,
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: jsonSchema(projectConversationParamsSchema.shape.projectId),
          },
        ],
        responses: {
          200: success(conversationList),
          ...errors(404, 422),
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
    [`${endpoints.apiPrefix}${endpoints.conversations.root}`]: {
      post: {
        tags: ["Conversations"],
        operationId: "streamConversation",
        summary: "Create or continue a conversation and stream its AI response",
        description:
          "This is the only HTTP endpoint that starts AI chat. Requires Accept: text/event-stream. Provide projectId to atomically create a conversation, its first user message, and pending chat run, or provide conversationId to append a message to an owned conversation. Exactly one target is required. After persistence, the request starts Gemini and streams message.created followed by the current AI text or routing progress. message.created exposes conversationId, messageId, and runId for read-only history and response-status requests; chat.completed also exposes assistantMessageId when one exists. The stream ends at chat.completed and does not wait for background image or video generation. A first message requires text content so its conversation name can be derived.",
        parameters: [
          ...languageParameters,
          {
            name: "Accept",
            in: "header",
            required: true,
            description: "Must include text/event-stream.",
            schema: { type: "string", const: "text/event-stream" },
          },
        ],
        requestBody: requestBody(sendMessageSchema),
        responses: {
          200: {
            description: "Conversation message and AI response event stream",
            headers: responseHeaders,
            content: {
              "text/event-stream": {
                schema: { type: "string" },
                example:
                  'event: message.created\ndata: {"v":1,"conversationId":"f8a81760-c5fe-4aad-b040-15dbf72ffde8","messageId":"85eb57ee-3525-4f77-8758-5a409bf765e5","runId":"49bb81cd-cd9f-455f-a9f8-3875969613a8","message":{},"createdConversation":{}}\n\nevent: chat.started\ndata: {"v":1,"runId":"49bb81cd-cd9f-455f-a9f8-3875969613a8"}\n\nevent: assistant.delta\ndata: {"v":1,"delta":"Hello"}\n\nevent: chat.completed\ndata: {"v":1,"conversationId":"f8a81760-c5fe-4aad-b040-15dbf72ffde8","messageId":"85eb57ee-3525-4f77-8758-5a409bf765e5","assistantMessageId":"834c554f-f6da-40b1-bad5-d01398d9337c","runId":"49bb81cd-cd9f-455f-a9f8-3875969613a8","userMessage":{},"assistantMessage":{}}\n\n',
              },
            },
          },
          ...errors(400, 404, 406, 413, 415, 422),
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
        description:
          "Returns both user and assistant messages, ordered from newest to oldest. Generated image or video results are assistant messages whose assetIds can be fetched through the asset content endpoint.",
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
    },
    [`${endpoints.apiPrefix}${endpoints.messages.response}`
      .replace(":conversationId", "{conversationId}")
      .replace(":messageId", "{messageId}")]: {
      get: {
        tags: ["Messages"],
        operationId: "getMessageResponse",
        summary: "Read the assistant response status for a user message",
        description:
          "Polling endpoint for a persisted chat run. Use the user-message ID emitted as messageId by the message.created SSE event, not assistantMessageId. A queued media generation keeps assistantMessage null until its worker creates the final message. This request never starts or retries AI processing.",
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
            description: "Triggering user-message ID emitted by message.created.",
            schema: jsonSchema(messageResponseParamsSchema.shape.messageId),
          },
        ],
        responses: {
          200: success(messageResponseState, "Assistant response status"),
          ...errors(404, 422),
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.assets.root}`]: {
      get: {
        tags: ["Assets"],
        operationId: "listAssets",
        summary: "List owned assets",
        description:
          "Assets are ordered from newest to oldest and may be filtered by kind.",
        parameters: [
          ...languageParameters,
          ...cursorPaginationParameters,
          {
            name: "kind",
            in: "query",
            required: false,
            schema: jsonSchema(assetKindSchema),
          },
        ],
        responses: {
          200: success(assetList),
          ...errors(422),
          ...protectedErrors,
        },
      },
      post: {
        tags: ["Assets"],
        operationId: "uploadImage",
        summary: "Upload one image asset",
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
          201: success(asset, "Asset uploaded"),
          ...errors(400, 413, 415, 422),
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.assets.delete}`]: {
      post: {
        tags: ["Assets"],
        operationId: "deleteAssets",
        summary: "Delete unattached assets",
        description: `Deletes up to ${MAX_ASSET_DELETE_COUNT} owned assets that are not attached to a message. Non-owned, missing, duplicate, and already attached asset IDs are skipped; the response only contains IDs that were deleted.`,
        parameters: languageParameters,
        requestBody: requestBody(deleteAssetsSchema),
        responses: {
          200: success(deletedAssets, "Assets deleted"),
          ...errors(400, 413, 415, 422),
          ...protectedErrors,
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.assets.byId}`.replace(":assetId", "{assetId}")]: {
      get: {
        tags: ["Assets"],
        operationId: "getAssetContent",
        summary: "Get owned asset content",
        parameters: [
          ...languageParameters,
          {
            name: "assetId",
            in: "path",
            required: true,
            schema: jsonSchema(assetParamsSchema.shape.assetId),
          },
        ],
        responses: {
          200: {
            description: "Asset bytes",
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
