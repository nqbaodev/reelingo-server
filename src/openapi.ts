import { z } from "zod";
import { config } from "@/config";
import { endpoints } from "@/shared/http/endpoints";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/core/i18n";
import { generateTextSchema } from "@/features/ai/presentation/ai.validators";
import {
  googleLoginSchema,
  refreshTokenSchema,
} from "@/features/auth/presentation/auth.validators";
import {
  updateUserSchema,
  listUsersQuerySchema,
  userIdParamsSchema,
} from "@/features/users/presentation/user.validators";

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
    415: "Unsupported encoding",
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

const user = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
const currentUser = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
});
const tokenPair = z.object({ accessToken: z.string(), refreshToken: z.string() });
const authErrors = errors(400, 401, 413, 415, 422, 429, 500, 503);
const protectedErrors = errors(401, 429, 500, 503);
const userId = {
  name: "id",
  in: "path",
  required: true,
  schema: jsonSchema(userIdParamsSchema.shape.id),
};
const userParameters = [...languageParameters, userId];

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Reelingo API",
    version: "1.0.0",
    description:
      "Localized API envelopes. Success: {success,message,data}; failure: {success,message,error:{code}}. DELETE returns an empty 204. Health probes are unwrapped.",
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
          200: success(tokenPair.extend({ user: currentUser })),
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
    [`${endpoints.apiPrefix}${endpoints.auth.me}`]: {
      get: {
        tags: ["Auth"],
        operationId: "getCurrentUser",
        summary: "Get the current user",
        parameters: languageParameters,
        responses: { 200: success(currentUser), ...protectedErrors },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.users.list}`]: {
      get: {
        tags: ["Users"],
        operationId: "listUsers",
        summary: "List users",
        parameters: [
          ...languageParameters,
          ...Object.entries(listUsersQuerySchema.shape).map(([name, schema]) => ({
            name,
            in: "query",
            required: false,
            schema: jsonSchema(schema, "output"),
          })),
        ],
        responses: {
          200: success(
            z.object({
              items: z.array(user),
              total: z.number().int(),
              page: z.number().int(),
              pageSize: z.number().int(),
              totalPages: z.number().int(),
            }),
          ),
          ...protectedErrors,
          ...errors(422),
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.users.byId.replace(":id", "{id}")}`]: {
      get: {
        tags: ["Users"],
        operationId: "getUser",
        summary: "Get a user",
        parameters: userParameters,
        responses: { 200: success(user), ...protectedErrors, ...errors(404, 422) },
      },
      patch: {
        tags: ["Users"],
        operationId: "updateUser",
        summary: "Update a user",
        parameters: userParameters,
        requestBody: requestBody(updateUserSchema),
        responses: { 200: success(user), ...authErrors, ...errors(404, 409) },
      },
      delete: {
        tags: ["Users"],
        operationId: "deleteUser",
        summary: "Delete a user",
        parameters: userParameters,
        responses: {
          204: { description: "Deleted; no response body", headers: responseHeaders },
          ...protectedErrors,
          ...errors(404, 422),
        },
      },
    },
    [`${endpoints.apiPrefix}${endpoints.ai.generate}`]: {
      post: {
        tags: ["AI"],
        operationId: "generateText",
        summary: "Generate text with Gemini",
        parameters: languageParameters,
        requestBody: requestBody(generateTextSchema),
        responses: { 200: success(z.object({ text: z.string() })), ...authErrors },
      },
    },
  },
};
