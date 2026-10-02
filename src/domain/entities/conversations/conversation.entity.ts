export interface Conversation {
  id: string;
  projectId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationSummary extends Conversation {
  lastMessageAt: Date;
}
