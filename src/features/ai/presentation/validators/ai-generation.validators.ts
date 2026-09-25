import { z } from "zod";
import {
  DEFAULT_AI_GENERATION_ENHANCE_PROMPT,
  DEFAULT_AI_GENERATION_OUTPUT_COUNT,
  IMAGE_GENERATION_ASPECT_RATIOS,
  IMAGE_GENERATION_RESOLUTIONS,
  MAX_AI_GENERATION_OUTPUT_COUNT,
  MIN_AI_GENERATION_OUTPUT_COUNT,
  VIDEO_GENERATION_ASPECT_RATIOS,
  VIDEO_GENERATION_RESOLUTIONS,
  type AiGenerationConfig,
} from "../../domain";

function nullableConfigValueSchema<const Values extends readonly [string, ...string[]]>(
  values: Values,
) {
  return z
    .enum(values)
    .nullable()
    .optional()
    .transform((value) => value ?? null);
}

const outputCountSchema = z
  .number()
  .int()
  .min(MIN_AI_GENERATION_OUTPUT_COUNT)
  .max(MAX_AI_GENERATION_OUTPUT_COUNT)
  .default(DEFAULT_AI_GENERATION_OUTPUT_COUNT);

export const imageGenerationConfigSchema: z.ZodType<AiGenerationConfig> = z.strictObject({
  aspectRatio: nullableConfigValueSchema(IMAGE_GENERATION_ASPECT_RATIOS),
  resolution: nullableConfigValueSchema(IMAGE_GENERATION_RESOLUTIONS),
  outputCount: outputCountSchema,
  enhancePrompt: z.literal(false).default(false),
});

export const videoGenerationConfigSchema: z.ZodType<AiGenerationConfig> = z.strictObject({
  aspectRatio: nullableConfigValueSchema(VIDEO_GENERATION_ASPECT_RATIOS),
  resolution: nullableConfigValueSchema(VIDEO_GENERATION_RESOLUTIONS),
  outputCount: z.literal(1).default(DEFAULT_AI_GENERATION_OUTPUT_COUNT),
  enhancePrompt: z.boolean().default(DEFAULT_AI_GENERATION_ENHANCE_PROMPT),
});
