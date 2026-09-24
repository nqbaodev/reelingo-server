export const MessageRole = {
  USER: "user",
  ASSISTANT: "assistant",
} as const;

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export interface MessageMedia {
  id: string;
}

export interface MessagePayload {
  content: string | null;
  mediaIds: string[];
}

interface MessageBase {
  id: string;
  conversationId: string;
  role: MessageRole;
  createdAt: Date;
}

export type Message = MessageBase & { content: string | null; media: MessageMedia[] };

export type NewMessage = {
  conversationId: string;
  role: MessageRole;
} & MessagePayload;
