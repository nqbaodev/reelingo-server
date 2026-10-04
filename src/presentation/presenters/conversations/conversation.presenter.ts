import {
  encodeCursor,
  type CursorListResponse,
  type CursorPage,
} from "@/application/pagination";
import type { ConversationListCursor } from "@/application/interfaces/repositories/conversation.repository";
import type { Conversation, ConversationSummary } from "@/domain";
import { toUnixMilliseconds } from "@/utils";
import type {
  ConversationResponseDto,
  ConversationSummaryResponseDto,
} from "@/presentation/dtos/conversations/conversation.dto";

export function toConversationResponse(
  conversation: Conversation,
): ConversationResponseDto {
  return {
    id: conversation.id,
    projectId: conversation.projectId,
    name: conversation.name,
    createdAt: toUnixMilliseconds(conversation.createdAt),
    updatedAt: toUnixMilliseconds(conversation.updatedAt),
  };
}

export function toConversationListResponse(
  page: CursorPage<ConversationSummary, ConversationListCursor>,
): CursorListResponse<ConversationSummaryResponseDto> {
  return {
    items: page.items.map((conversation) => ({
      ...toConversationResponse(conversation),
      lastMessageAt: toUnixMilliseconds(conversation.lastMessageAt),
    })),
    nextCursor: page.nextCursor
      ? encodeCursor({
          lastMessageAt: page.nextCursor.lastMessageAt.toISOString(),
          conversationId: page.nextCursor.conversationId,
        })
      : null,
  };
}
