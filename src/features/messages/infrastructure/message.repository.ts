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

export interface ListMessagesInput {
  userId: number;
  conversationId: string;
  limit: number;
  cursor: MessageListCursor | undefined;
}

export interface MessageRepository {
  createForConversation(
    input: CreateMessageForConversationInput,
  ): Promise<Message | null>;
  listByConversation(
    input: ListMessagesInput,
  ): Promise<CursorPage<Message, MessageListCursor> | null>;
}
