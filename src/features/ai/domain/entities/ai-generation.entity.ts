export const AiGenerationStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type AiGenerationStatus =
  (typeof AiGenerationStatus)[keyof typeof AiGenerationStatus];

export const MIN_AI_GENERATION_OUTPUT_COUNT = 1;
export const MAX_AI_GENERATION_OUTPUT_COUNT = 4;
export const DEFAULT_AI_GENERATION_OUTPUT_COUNT = 1;
export const DEFAULT_AI_GENERATION_ENHANCE_PROMPT = false;

export const IMAGE_GENERATION_ASPECT_RATIOS = [
  "1:1",
  "1:4",
  "4:1",
  "1:8",
  "8:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
] as const;
export const IMAGE_GENERATION_RESOLUTIONS = ["512", "1K", "2K", "4K"] as const;
export const VIDEO_GENERATION_ASPECT_RATIOS = ["16:9", "9:16"] as const;
export const VIDEO_GENERATION_RESOLUTIONS = ["720p", "1080p", "4k"] as const;

export type ImageGenerationAspectRatio = (typeof IMAGE_GENERATION_ASPECT_RATIOS)[number];
export type ImageGenerationResolution = (typeof IMAGE_GENERATION_RESOLUTIONS)[number];
export type VideoGenerationAspectRatio = (typeof VIDEO_GENERATION_ASPECT_RATIOS)[number];
export type VideoGenerationResolution = (typeof VIDEO_GENERATION_RESOLUTIONS)[number];

export interface AiGenerationConfig {
  aspectRatio: ImageGenerationAspectRatio | VideoGenerationAspectRatio | null;
  resolution: ImageGenerationResolution | VideoGenerationResolution | null;
  outputCount: number;
  enhancePrompt: boolean;
}

export function createDefaultAiGenerationConfig(): AiGenerationConfig {
  return {
    aspectRatio: null,
    resolution: null,
    outputCount: DEFAULT_AI_GENERATION_OUTPUT_COUNT,
    enhancePrompt: DEFAULT_AI_GENERATION_ENHANCE_PROMPT,
  };
}

export function parseAiGenerationConfig(value: unknown): AiGenerationConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("AI generation config snapshot must be an object");
  }

  const config = value as Record<string, unknown>;
  const supportedAspectRatios: readonly unknown[] = [
    ...IMAGE_GENERATION_ASPECT_RATIOS,
    ...VIDEO_GENERATION_ASPECT_RATIOS,
  ];
  const supportedResolutions: readonly unknown[] = [
    ...IMAGE_GENERATION_RESOLUTIONS,
    ...VIDEO_GENERATION_RESOLUTIONS,
  ];
  if (
    (config.aspectRatio !== null &&
      !supportedAspectRatios.includes(config.aspectRatio)) ||
    (config.resolution !== null && !supportedResolutions.includes(config.resolution)) ||
    typeof config.outputCount !== "number" ||
    !Number.isInteger(config.outputCount) ||
    config.outputCount < MIN_AI_GENERATION_OUTPUT_COUNT ||
    config.outputCount > MAX_AI_GENERATION_OUTPUT_COUNT ||
    typeof config.enhancePrompt !== "boolean"
  ) {
    throw new Error("AI generation config snapshot has an invalid shape");
  }

  return {
    aspectRatio: config.aspectRatio as AiGenerationConfig["aspectRatio"],
    resolution: config.resolution as AiGenerationConfig["resolution"],
    outputCount: config.outputCount,
    enhancePrompt: config.enhancePrompt,
  };
}
