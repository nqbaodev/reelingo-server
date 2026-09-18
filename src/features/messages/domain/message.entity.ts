export const MessageRole = {
  USER: "user",
  ASSISTANT: "assistant",
} as const;

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export type MessagePayload =
  | {
      content: string;
      mediaId: string | null;
    }
  | {
      content: string | null;
      mediaId: string;
    };

interface MessageBase {
  id: string;
  conversationId: string;
  role: MessageRole;
  createdAt: Date;
}

export type Message = MessageBase & MessagePayload;

export type NewMessage = {
  conversationId: string;
  role: MessageRole;
} & MessagePayload;
