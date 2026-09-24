import {
  encodeCursor,
  type CursorListResponse,
  type CursorPage,
} from "@/core/pagination";
import type { Conversation, ConversationSummary } from "../domain";
import type { ConversationListCursor } from "../infrastructure";

export interface ConversationResponse {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummaryResponse extends ConversationResponse {
  lastMessageAt: string;
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
  page: CursorPage<ConversationSummary, ConversationListCursor>,
): CursorListResponse<ConversationSummaryResponse> {
  return {
    items: page.items.map((conversation) => ({
      ...toConversationResponse(conversation),
      lastMessageAt: conversation.lastMessageAt.toISOString(),
    })),
    nextCursor: page.nextCursor
      ? encodeCursor({
          lastMessageAt: page.nextCursor.lastMessageAt.toISOString(),
          conversationId: page.nextCursor.conversationId,
        })
      : null,
  };
}
