export const MediaType = {
  IMAGE: "image",
  VIDEO: "video",
} as const;

export type MediaType = (typeof MediaType)[keyof typeof MediaType];

export interface AgentInput {
  content: string;
  intentHint: MediaType | null;
}

export type AgentResult =
  { type: "reply"; content: string } | { type: "generation"; mediaType: MediaType };
