import { MAX_CONVERSATION_NAME_LENGTH } from "@/config";
import { NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import type { Conversation } from "../../domain";
import type { ConversationRepository } from "../../infrastructure";

function createInitialConversationName(content: string): string {
  return Array.from(content).slice(0, MAX_CONVERSATION_NAME_LENGTH).join("");
}

export class CreateConversationUseCase {
  constructor(private readonly conversations: ConversationRepository) {}

  async execute(
    userId: number,
    projectId: string,
    content: string,
  ): Promise<Conversation> {
    const conversation = await this.conversations.create({
      userId,
      projectId,
      name: createInitialConversationName(content),
      firstMessageContent: content,
    });
    if (!conversation) throw new NotFoundError(I18n.projectNotFound);
    return conversation;
  }
}
