import { z } from "zod";

export const CHAT_PROTOCOL_VERSION = 1 as const;

export const chatRequestSchema = z.object({
  protocolVersion: z.literal(CHAT_PROTOCOL_VERSION),
  requestId: z.uuid(),
  content: z.string().trim().min(1).max(8_000),
  intentHint: z.enum(["image", "video"]).nullable(),
});

const eventEnvelopeSchema = z.object({
  protocolVersion: z.literal(CHAT_PROTOCOL_VERSION),
  requestId: z.uuid(),
});

export const chatEventSchema = z.discriminatedUnion("type", [
  eventEnvelopeSchema.extend({
    type: z.literal("assistant.delta"),
    delta: z.string().min(1),
  }),
  eventEnvelopeSchema.extend({
    type: z.literal("response.completed"),
    result: z.discriminatedUnion("type", [
      z.object({ type: z.literal("reply"), content: z.string().min(1) }),
      z.object({
        type: z.literal("generation"),
        mediaType: z.enum(["image", "video"]),
      }),
    ]),
  }),
  eventEnvelopeSchema.extend({
    type: z.literal("response.failed"),
    code: z.literal("AGENT_UNAVAILABLE"),
  }),
]);

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatEvent = z.infer<typeof chatEventSchema>;
