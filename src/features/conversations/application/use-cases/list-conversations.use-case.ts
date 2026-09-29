import type { CursorPage } from "@/core/pagination";
import { NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import type { ConversationSummary } from "../../domain";
import type {
  ConversationListCursor,
  ConversationRepository,
} from "../../infrastructure";

export interface ListConversationsOptions {
  limit: number;
  cursor: ConversationListCursor | undefined;
}

export class ListConversationsUseCase {
  constructor(private readonly conversations: ConversationRepository) {}

  async execute(
    userId: number,
    projectId: string,
    options: ListConversationsOptions,
  ): Promise<CursorPage<ConversationSummary, ConversationListCursor>> {
    const page = await this.conversations.listByProject({
      userId,
      projectId,
      ...options,
    });
    if (!page) throw new NotFoundError(I18n.projectNotFound);
    return page;
  }
}
