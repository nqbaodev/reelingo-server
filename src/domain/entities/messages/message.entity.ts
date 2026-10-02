import type { AiGenerationConfig, AiGenerationStatus } from "../ai/ai-generation.entity";
import type { ChatContext, MessageChatRun } from "../ai/chat.entity";
import type { AssetKind } from "../assets/asset.entity";

export const MessageRole = {
  USER: "user",
  ASSISTANT: "assistant",
} as const;

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export interface MessageGeneration {
  id: string;
  triggerMessageId: string;
  type: AssetKind;
  status: AiGenerationStatus;
  config: AiGenerationConfig;
  resultMessageId: string | null;
}

export interface MessagePayload {
  content: string | null;
  assetIds: string[];
}

export interface CreateMessagePayload extends MessagePayload {
  aiContext: ChatContext;
}

interface MessageBase {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string | null;
  assetIds: string[];
  generation: MessageGeneration | null;
  chatRun: MessageChatRun | null;
  createdAt: Date;
}

export type Message = MessageBase;

export type NewMessage = {
  conversationId: string;
  role: MessageRole;
} & MessagePayload;
