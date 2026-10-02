import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AI_AGENT_HOST: z.string().trim().min(1).default("127.0.0.1"),
  AI_AGENT_PORT: z.coerce.number().int().positive().max(65_535).default(4_100),
  AI_AGENT_SERVICE_TOKEN: z.string().min(32),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-2.5-flash"),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().max(300_000).default(30_000),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    `Invalid AI agent environment variables:\n${z.prettifyError(parsed.error)}`,
  );
  throw new Error("Invalid AI agent environment variables");
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  server: {
    host: env.AI_AGENT_HOST,
    port: env.AI_AGENT_PORT,
    serviceToken: env.AI_AGENT_SERVICE_TOKEN,
  },
  gemini: {
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
    timeoutMs: env.GEMINI_TIMEOUT_MS,
  },
} as const;
