import type { Conversation, NewConversation } from "../domain";
import type { CursorPage } from "@/core/pagination";

export interface ConversationListCursor {
  updatedAt: Date;
  id: string;
}

export interface ListConversationsInput {
  userId: number;
  limit: number;
  cursor: ConversationListCursor | undefined;
}

export interface ConversationRepository {
  create(data: NewConversation): Promise<Conversation>;
  listByUser(
    input: ListConversationsInput,
  ): Promise<CursorPage<Conversation, ConversationListCursor>>;
  updateName(id: string, userId: number, name: string): Promise<Conversation | null>;
}
