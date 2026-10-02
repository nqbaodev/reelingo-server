import { NotFoundError } from "@/application/errors";
import { I18n } from "@/application/i18n";
import type { Conversation } from "@/domain";
import type { ConversationRepository } from "@/application/interfaces/repositories/conversation.repository";

export class UpdateConversationNameUseCase {
  constructor(private readonly conversations: ConversationRepository) {}

  async execute(userId: number, id: string, name: string): Promise<Conversation> {
    const conversation = await this.conversations.updateName(id, userId, name);
    if (!conversation) {
      throw new NotFoundError(I18n.conversationNotFound);
    }
    return conversation;
  }
}
