export interface Conversation {
  id: string;
  userId: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewConversation = Pick<Conversation, "userId" | "name">;
