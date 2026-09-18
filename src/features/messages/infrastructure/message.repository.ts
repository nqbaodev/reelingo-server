import type { CursorPage } from "@/core/pagination";
import type { Message, NewMessage } from "../domain";

export interface MessageListCursor {
  createdAt: Date;
  id: string;
}

export interface CreateMessageForConversationInput {
  userId: number;
  message: NewMessage;
}

export const CreateMessageResultType = {
  CREATED: "created",
  CONVERSATION_NOT_FOUND: "conversationNotFound",
  MEDIA_NOT_FOUND: "mediaNotFound",
} as const;

export type CreateMessageForConversationResult =
  | {
      type: typeof CreateMessageResultType.CREATED;
      message: Message;
    }
  | { type: typeof CreateMessageResultType.CONVERSATION_NOT_FOUND }
  | { type: typeof CreateMessageResultType.MEDIA_NOT_FOUND };

export interface ListMessagesInput {
  userId: number;
  conversationId: string;
  limit: number;
  cursor: MessageListCursor | undefined;
}

export interface MessageRepository {
  createForConversation(
    input: CreateMessageForConversationInput,
  ): Promise<CreateMessageForConversationResult>;
  listByConversation(
    input: ListMessagesInput,
  ): Promise<CursorPage<Message, MessageListCursor> | null>;
}
