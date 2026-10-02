import { NotFoundError } from "@/application/errors";
import { I18n } from "@/application/i18n";
import type {
  MessageRepository,
  MessageResponseState,
} from "@/application/interfaces/repositories/message.repository";

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
