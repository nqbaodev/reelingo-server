import type { Conversation, ConversationSummary } from "@/domain";
import type { CursorPage } from "@/application/pagination";

export interface ConversationListCursor {
  lastMessageAt: Date;
  conversationId: string;
}

export interface ListConversationsInput {
  userId: number;
  projectId: string;
  limit: number;
  cursor: ConversationListCursor | undefined;
}

export interface ConversationRepository {
  listByProject(
    input: ListConversationsInput,
  ): Promise<CursorPage<ConversationSummary, ConversationListCursor> | null>;
  updateName(id: string, userId: number, name: string): Promise<Conversation | null>;
}
