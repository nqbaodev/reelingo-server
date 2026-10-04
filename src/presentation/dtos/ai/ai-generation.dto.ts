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
} from "@/domain";

function optionalNullableConfigValueSchema<
  const Values extends readonly [string, ...string[]],
>(
  values: Values,
) {
  return z.enum(values).nullable().optional();
}

const outputCountSchema = z
  .number()
  .int()
  .min(MIN_AI_GENERATION_OUTPUT_COUNT)
  .max(MAX_AI_GENERATION_OUTPUT_COUNT)
  .default(DEFAULT_AI_GENERATION_OUTPUT_COUNT);

export const imageGenerationConfigRequestSchema = z.strictObject({
  aspectRatio: optionalNullableConfigValueSchema(IMAGE_GENERATION_ASPECT_RATIOS),
  resolution: optionalNullableConfigValueSchema(IMAGE_GENERATION_RESOLUTIONS),
  outputCount: outputCountSchema,
  enhancePrompt: z.literal(false).default(false),
});

export const videoGenerationConfigRequestSchema = z.strictObject({
  aspectRatio: optionalNullableConfigValueSchema(VIDEO_GENERATION_ASPECT_RATIOS),
  resolution: optionalNullableConfigValueSchema(VIDEO_GENERATION_RESOLUTIONS),
  outputCount: z.literal(1).default(DEFAULT_AI_GENERATION_OUTPUT_COUNT),
  enhancePrompt: z.boolean().default(DEFAULT_AI_GENERATION_ENHANCE_PROMPT),
});

export const imageGenerationConfigSchema: z.ZodType<AiGenerationConfig> =
  imageGenerationConfigRequestSchema.transform((config) => ({
    ...config,
    aspectRatio: config.aspectRatio ?? null,
    resolution: config.resolution ?? null,
  }));

export const videoGenerationConfigSchema: z.ZodType<AiGenerationConfig> =
  videoGenerationConfigRequestSchema.transform((config) => ({
    ...config,
    aspectRatio: config.aspectRatio ?? null,
    resolution: config.resolution ?? null,
  }));

export const imageGenerationConfigResponseSchema: z.ZodType<AiGenerationConfig> =
  z.strictObject({
    aspectRatio: z.enum(IMAGE_GENERATION_ASPECT_RATIOS).nullable(),
    resolution: z.enum(IMAGE_GENERATION_RESOLUTIONS).nullable(),
    outputCount: z
      .number()
      .int()
      .min(MIN_AI_GENERATION_OUTPUT_COUNT)
      .max(MAX_AI_GENERATION_OUTPUT_COUNT),
    enhancePrompt: z.literal(false),
  });

export const videoGenerationConfigResponseSchema: z.ZodType<AiGenerationConfig> =
  z.strictObject({
    aspectRatio: z.enum(VIDEO_GENERATION_ASPECT_RATIOS).nullable(),
    resolution: z.enum(VIDEO_GENERATION_RESOLUTIONS).nullable(),
    outputCount: z.literal(1),
    enhancePrompt: z.boolean(),
  });
