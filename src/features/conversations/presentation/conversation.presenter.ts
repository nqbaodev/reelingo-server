import {
  encodeCursor,
  type CursorListResponse,
  type CursorPage,
} from "@/core/pagination";
import type { Conversation } from "../domain";
import type { ConversationListCursor } from "../infrastructure";

export interface ConversationResponse {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export function toConversationResponse(conversation: Conversation): ConversationResponse {
  return {
    id: conversation.id,
    name: conversation.name,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export function toConversationListResponse(
  page: CursorPage<Conversation, ConversationListCursor>,
): CursorListResponse<ConversationResponse> {
  return {
    items: page.items.map(toConversationResponse),
    nextCursor: page.nextCursor
      ? encodeCursor({
          updatedAt: page.nextCursor.updatedAt.toISOString(),
          id: page.nextCursor.id,
        })
      : null,
  };
}
