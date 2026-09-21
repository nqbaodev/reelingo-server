import { NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import {
  MessageRole,
  type CreateMessagePayload,
  type Message,
} from "../domain";
import {
  CreateMessageResultType,
  type MessageRepository,
} from "../infrastructure";

export class CreateMessageUseCase {
  constructor(private readonly messages: MessageRepository) {}

  async execute(
    userId: number,
    conversationId: string,
    payload: CreateMessagePayload,
  ): Promise<Message> {
    const { aiContext, ...messagePayload } = payload;
    const createResult = await this.messages.createForConversation({
      userId,
      chatContext: aiContext,
      message: {
        conversationId,
        role: MessageRole.USER,
        ...messagePayload,
      },
    });

    switch (createResult.type) {
      case CreateMessageResultType.CONVERSATION_NOT_FOUND:
        throw new NotFoundError(I18n.conversationNotFound);
      case CreateMessageResultType.MEDIA_NOT_FOUND:
        throw new NotFoundError(I18n.mediaNotFound);
    }

    return createResult.message;
  }
}
