import type { Conversation } from "../domain";
import type { ConversationRepository } from "../infrastructure";

export class CreateConversationUseCase {
  constructor(private readonly conversations: ConversationRepository) {}

  execute(userId: number, name: string): Promise<Conversation> {
    return this.conversations.create({ userId, name });
  }
}
