import {
  encodeCursor,
  type CursorListResponse,
  type CursorPage,
} from "@/core/pagination";
import type { Message } from "../domain";
import { toMediaLink } from "@/features/media/presentation/media.presenter";
import type { MessageListCursor } from "../infrastructure";

export interface MessageResponse {
  id: string;
  conversationId: string;
  role: Message["role"];
  content: string | null;
  media: { id: string; path: string; url: string }[];
  createdAt: string;
}

export function toMessageResponse(message: Message): MessageResponse {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    media: message.media.map((item) => toMediaLink(item.id)),
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
