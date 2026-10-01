import type { AssetKind } from "@/features/assets/domain";

export interface GenerateTextInput {
  prompt: string;
  type: AssetKind;
  outputCount: number;
  signal: AbortSignal;
}

export interface TextGenerator {
  generateText(input: GenerateTextInput): Promise<string>;
}
