export const AiGenerationStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type AiGenerationStatus =
  (typeof AiGenerationStatus)[keyof typeof AiGenerationStatus];

export const MAX_AI_GENERATION_CONFIG_VALUE_LENGTH = 32;
export const MIN_AI_GENERATION_OUTPUT_COUNT = 1;
export const MAX_AI_GENERATION_OUTPUT_COUNT = 4;
export const DEFAULT_AI_GENERATION_OUTPUT_COUNT = 1;
export const DEFAULT_AI_GENERATION_ENHANCE_PROMPT = false;

export interface AiGenerationConfig {
  aspectRatio: string | null;
  resolution: string | null;
  quality: string | null;
  outputCount: number;
  enhancePrompt: boolean;
}

export function createDefaultAiGenerationConfig(): AiGenerationConfig {
  return {
    aspectRatio: null,
    resolution: null,
    quality: null,
    outputCount: DEFAULT_AI_GENERATION_OUTPUT_COUNT,
    enhancePrompt: DEFAULT_AI_GENERATION_ENHANCE_PROMPT,
  };
}

export function parseAiGenerationConfig(value: unknown): AiGenerationConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("AI generation config snapshot must be an object");
  }

  const config = value as Record<string, unknown>;
  const nullableStrings = [config.aspectRatio, config.resolution, config.quality];
  if (
    nullableStrings.some(
      (item) =>
        item !== null &&
        (typeof item !== "string" ||
          item.length < 1 ||
          item.length > MAX_AI_GENERATION_CONFIG_VALUE_LENGTH ||
          item !== item.trim()),
    ) ||
    typeof config.outputCount !== "number" ||
    !Number.isInteger(config.outputCount) ||
    config.outputCount < MIN_AI_GENERATION_OUTPUT_COUNT ||
    config.outputCount > MAX_AI_GENERATION_OUTPUT_COUNT ||
    typeof config.enhancePrompt !== "boolean"
  ) {
    throw new Error("AI generation config snapshot has an invalid shape");
  }

  return {
    aspectRatio: config.aspectRatio as string | null,
    resolution: config.resolution as string | null,
    quality: config.quality as string | null,
    outputCount: config.outputCount,
    enhancePrompt: config.enhancePrompt,
  };
}
