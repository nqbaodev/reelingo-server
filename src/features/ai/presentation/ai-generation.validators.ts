import { z } from "zod";
import {
  DEFAULT_AI_GENERATION_ENHANCE_PROMPT,
  DEFAULT_AI_GENERATION_OUTPUT_COUNT,
  MAX_AI_GENERATION_CONFIG_VALUE_LENGTH,
  MAX_AI_GENERATION_OUTPUT_COUNT,
  MIN_AI_GENERATION_OUTPUT_COUNT,
  type AiGenerationConfig,
} from "../domain";

function nullableConfigValueSchema() {
  return z
    .string()
    .trim()
    .min(1)
    .max(MAX_AI_GENERATION_CONFIG_VALUE_LENGTH)
    .nullable()
    .optional()
    .transform((value) => value ?? null);
}

export const aiGenerationConfigSchema: z.ZodType<AiGenerationConfig> =
  z.strictObject({
    aspectRatio: nullableConfigValueSchema(),
    resolution: nullableConfigValueSchema(),
    quality: nullableConfigValueSchema(),
    outputCount: z
      .number()
      .int()
      .min(MIN_AI_GENERATION_OUTPUT_COUNT)
      .max(MAX_AI_GENERATION_OUTPUT_COUNT)
      .default(DEFAULT_AI_GENERATION_OUTPUT_COUNT),
    enhancePrompt: z
      .boolean()
      .default(DEFAULT_AI_GENERATION_ENHANCE_PROMPT),
  });
