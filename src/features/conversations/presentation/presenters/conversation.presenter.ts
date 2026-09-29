import {
  encodeCursor,
  type CursorListResponse,
  type CursorPage,
} from "@/core/pagination";
import type { Conversation, ConversationSummary } from "../../domain";
import type { ConversationListCursor } from "../../infrastructure";
import type {
  ConversationResponseDto,
  ConversationSummaryResponseDto,
} from "../dtos/conversation.dto";

export function toConversationResponse(
  conversation: Conversation,
): ConversationResponseDto {
  return {
    id: conversation.id,
    projectId: conversation.projectId,
    name: conversation.name,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export function toConversationListResponse(
  page: CursorPage<ConversationSummary, ConversationListCursor>,
): CursorListResponse<ConversationSummaryResponseDto> {
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
