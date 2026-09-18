import type { CursorPage } from "@/core/pagination";
import type { Conversation } from "../domain";
import type { ConversationListCursor, ConversationRepository } from "../infrastructure";

export interface ListConversationsOptions {
  limit: number;
  cursor: ConversationListCursor | undefined;
}

export class ListConversationsUseCase {
  constructor(private readonly conversations: ConversationRepository) {}

  execute(
    userId: number,
    options: ListConversationsOptions,
  ): Promise<CursorPage<Conversation, ConversationListCursor>> {
    return this.conversations.listByUser({ userId, ...options });
  }
}
