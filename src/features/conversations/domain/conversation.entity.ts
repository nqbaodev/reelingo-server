export interface Conversation {
  id: string;
  userId: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationSummary extends Conversation {
  lastMessageAt: Date;
}
