import {
  encodeCursor,
  type CursorListResponse,
  type CursorPage,
} from "@/core/pagination";
import type { Message } from "../domain";
import type { MessageListCursor } from "../infrastructure";

export interface MessageResponse {
  id: string;
  conversationId: string;
  role: Message["role"];
  content: string | null;
  mediaId: string | null;
  createdAt: string;
}

export function toMessageResponse(message: Message): MessageResponse {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    mediaId: message.mediaId,
    createdAt: message.createdAt.toISOString(),
  };
}

export function toMessageListResponse(
  page: CursorPage<Message, MessageListCursor>,
): CursorListResponse<MessageResponse> {
  return {
    items: page.items.map(toMessageResponse),
    nextCursor: page.nextCursor
      ? encodeCursor({
          createdAt: page.nextCursor.createdAt.toISOString(),
          id: page.nextCursor.id,
        })
      : null,
  };
}
