import { NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import type {
  MessageRepository,
  MessageResponseState,
} from "../infrastructure";

export class GetMessageResponseUseCase {
  constructor(private readonly messages: MessageRepository) {}

  async execute(
    userId: number,
    conversationId: string,
    triggerMessageId: string,
  ): Promise<MessageResponseState> {
    const response = await this.messages.getResponse({
      userId,
      conversationId,
      triggerMessageId,
    });
    if (!response) {
      throw new NotFoundError(I18n.messageNotFound);
    }

    return response;
  }
}
