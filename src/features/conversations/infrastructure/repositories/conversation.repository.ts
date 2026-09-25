import type { Conversation, ConversationSummary } from "../../domain";
import type { CursorPage } from "@/core/pagination";

export interface CreateConversationInput {
  userId: number;
  name: string;
  firstMessageContent: string;
}

export interface ConversationListCursor {
  lastMessageAt: Date;
  conversationId: string;
}

export interface ListConversationsInput {
  userId: number;
  limit: number;
  cursor: ConversationListCursor | undefined;
}

export interface ConversationRepository {
  create(input: CreateConversationInput): Promise<Conversation>;
  listByUser(
    input: ListConversationsInput,
  ): Promise<CursorPage<ConversationSummary, ConversationListCursor>>;
  updateName(id: string, userId: number, name: string): Promise<Conversation | null>;
}
