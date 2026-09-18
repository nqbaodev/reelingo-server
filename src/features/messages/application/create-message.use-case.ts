import { NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import { MessageRole, type Message, type MessagePayload } from "../domain";
import {
  CreateMessageResultType,
  type MessageRepository,
} from "../infrastructure";

export class CreateMessageUseCase {
  constructor(private readonly messages: MessageRepository) {}

  async execute(
    userId: number,
    conversationId: string,
    payload: MessagePayload,
  ): Promise<Message> {
    const result = await this.messages.createForConversation({
      userId,
      message: {
        conversationId,
        role: MessageRole.USER,
        ...payload,
      },
    });

    switch (result.type) {
      case CreateMessageResultType.CREATED:
        return result.message;
      case CreateMessageResultType.CONVERSATION_NOT_FOUND:
        throw new NotFoundError(I18n.conversationNotFound);
      case CreateMessageResultType.MEDIA_NOT_FOUND:
        throw new NotFoundError(I18n.mediaNotFound);
    }
  }
}
