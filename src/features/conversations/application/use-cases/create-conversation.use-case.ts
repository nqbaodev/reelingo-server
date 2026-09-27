import { MAX_CONVERSATION_NAME_LENGTH } from "@/config";
import type { Conversation } from "../../domain";
import type { ConversationRepository } from "../../infrastructure";

function createInitialConversationName(content: string): string {
  return Array.from(content).slice(0, MAX_CONVERSATION_NAME_LENGTH).join("");
}

export class CreateConversationUseCase {
  constructor(private readonly conversations: ConversationRepository) {}

  execute(userId: number, content: string): Promise<Conversation> {
    return this.conversations.create({
      userId,
      name: createInitialConversationName(content),
      firstMessageContent: content,
    });
  }
}
