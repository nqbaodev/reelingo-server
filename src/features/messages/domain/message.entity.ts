export const MessageRole = {
  USER: "user",
  ASSISTANT: "assistant",
} as const;

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export const MediaType = {
  IMAGE: "image",
  VIDEO: "video",
} as const;

export type MediaType = (typeof MediaType)[keyof typeof MediaType];

interface MediaDetails {
  url: string;
  mimeType: string;
}

export type MessageMedia =
  | (MediaDetails & {
      type: typeof MediaType.IMAGE;
    })
  | (MediaDetails & {
      type: typeof MediaType.VIDEO;
      thumbnailUrl: string | null;
      duration: number;
    });

export type MessagePayload =
  | {
      content: string;
      media: null;
    }
  | {
      content: string | null;
      media: MessageMedia;
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
