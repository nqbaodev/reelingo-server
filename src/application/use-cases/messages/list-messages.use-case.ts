import { NotFoundError } from "@/application/errors";
import { I18n } from "@/application/i18n";
import type { CursorPage } from "@/application/pagination";
import type { Message } from "@/domain";
import type {
  MessageListCursor,
  MessageRepository,
} from "@/application/interfaces/repositories/message.repository";

export interface ListMessagesOptions {
  limit: number;
  cursor: MessageListCursor | undefined;
}

export class ListMessagesUseCase {
  constructor(private readonly messages: MessageRepository) {}

  async execute(
    userId: number,
    conversationId: string,
    options: ListMessagesOptions,
  ): Promise<CursorPage<Message, MessageListCursor>> {
    const page = await this.messages.listByConversation({
      userId,
      conversationId,
      ...options,
    });
    if (!page) {
      throw new NotFoundError(I18n.conversationNotFound);
    }
    return page;
  }
}
