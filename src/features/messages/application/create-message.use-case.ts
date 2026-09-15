import { NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import { MessageRole, type Message, type MessagePayload } from "../domain";
import type { MessageRepository } from "../infrastructure";

export class CreateMessageUseCase {
  constructor(private readonly messages: MessageRepository) {}

  async execute(
    userId: number,
    conversationId: string,
    payload: MessagePayload,
  ): Promise<Message> {
    const message = await this.messages.createForConversation({
      userId,
      message: {
        conversationId,
        role: MessageRole.USER,
        ...payload,
      },
    });
    if (!message) {
      throw new NotFoundError(I18n.conversationNotFound);
    }
    return message;
  }
}
