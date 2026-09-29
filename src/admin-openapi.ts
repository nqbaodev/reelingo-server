import { z } from "zod";
import { listAdminLogsQuerySchema } from "@/features/admin-logs/presentation/dtos/admin-log.dto";
import { endpoints } from "@/shared/http/endpoints";
import { ADMIN_LOG_LEVELS } from "@/shared/logger/recent-log-store";

function jsonSchema(schema: z.ZodType, io: "input" | "output" = "input") {
  const { $schema: _dialect, ...result } = z.toJSONSchema(schema, { io });
  return result;
}

const adminLogSchema = z.object({
  id: z.number().int().positive(),
  timestamp: z.iso.datetime(),
  level: z.enum(ADMIN_LOG_LEVELS),
  message: z.string(),
  attributes: z.record(z.string(), z.unknown()),
});

const adminLogListSchema = z.object({ items: z.array(adminLogSchema) });
const successSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: adminLogListSchema,
});

const queryParameters = [
  {
    name: "limit",
    in: "query",
    required: false,
    description: "Maximum number of recent entries, newest first",
    schema: jsonSchema(listAdminLogsQuerySchema.shape.limit),
  },
  {
    name: "level",
    in: "query",
    required: false,
    description: "Return entries at this exact Pino level",
    schema: jsonSchema(listAdminLogsQuerySchema.shape.level.unwrap()),
  },
  {
    name: "requestId",
    in: "query",
    required: false,
    description: "Return entries correlated with this request ID",
    schema: jsonSchema(listAdminLogsQuerySchema.shape.requestId.unwrap()),
  },
  {
    name: "search",
    in: "query",
    required: false,
    description: "Case-insensitive search across the message and structured attributes",
    schema: jsonSchema(listAdminLogsQuerySchema.shape.search.unwrap()),
  },
];

export const adminOpenApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Reelingo Admin Logs",
    version: "1.0.0",
    description:
      "Process-local, bounded Pino log history for operational troubleshooting. Entries are cleared when the server restarts; individual records over 64 KiB are not retained.",
  },
  servers: [{ url: "/" }],
  security: [{ basicAuth: [] }],
  components: {
    securitySchemes: {
      basicAuth: { type: "http", scheme: "basic" },
    },
  },
  paths: {
    [endpoints.adminLogger.logs]: {
      get: {
        tags: ["Logs"],
        operationId: "listAdminLogs",
        summary: "List recent server logs",
        description:
          "Returns already-redacted logs retained by this server process. Results are newest first and are not durable across restarts.",
        parameters: queryParameters,
        responses: {
          200: {
            description: "Recent log entries",
            headers: {
              "Cache-Control": {
                description: "Prevents sensitive operational data from being cached",
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": { schema: jsonSchema(successSchema, "output") },
            },
          },
          401: { description: "Missing or invalid administrator credentials" },
          422: { description: "Invalid query parameters" },
          429: { description: "Too many failed authentication attempts" },
        },
      },
    },
  },
} as const;
