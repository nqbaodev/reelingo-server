import type { CursorPage } from "@/core/pagination";
import type {
  AiGenerationConfig,
  ChatContext,
  MessageChatRun,
} from "@/features/ai/domain";
import type { AssetKind } from "@/features/assets/domain";
import type { Message, MessageGeneration, NewMessage } from "../../domain";

export interface MessageListCursor {
  createdAt: Date;
  id: string;
}

export interface CreateMessageForConversationInput {
  userId: number;
  message: NewMessage;
  chatContext: ChatContext;
}

export const CreateMessageResultType = {
  CREATED: "created",
  CONVERSATION_NOT_FOUND: "conversationNotFound",
  ASSET_NOT_FOUND: "assetNotFound",
} as const;

export type CreateMessageForConversationResult =
  | {
      type: typeof CreateMessageResultType.CREATED;
      message: Message;
    }
  | { type: typeof CreateMessageResultType.CONVERSATION_NOT_FOUND }
  | { type: typeof CreateMessageResultType.ASSET_NOT_FOUND };

export interface ListMessagesInput {
  userId: number;
  conversationId: string;
  limit: number;
  cursor: MessageListCursor | undefined;
}

export interface ChatTurn {
  userMessage: Message;
  assistantMessage: Message | null;
}

export interface MessageResponseState {
  chatRun: MessageChatRun;
  generation: MessageGeneration | null;
  assistantMessage: Message | null;
}

export interface GetMessageResponseInput {
  userId: number;
  conversationId: string;
  triggerMessageId: string;
}

export interface ClaimChatInput {
  userId: number;
  conversationId: string;
  triggerMessageId: string;
  staleBefore: Date;
}

export const ClaimChatResultType = {
  CLAIMED: "claimed",
  COMPLETED: "completed",
  BUSY: "busy",
  NOT_FOUND: "notFound",
} as const;

export type ClaimChatResult =
  | {
      type: typeof ClaimChatResultType.CLAIMED;
      runId: string;
      claimVersion: Date;
      triggerMessage: Message;
      context: ChatContext;
    }
  | {
      type: typeof ClaimChatResultType.COMPLETED;
      turn: ChatTurn;
    }
  | { type: typeof ClaimChatResultType.BUSY }
  | { type: typeof ClaimChatResultType.NOT_FOUND };

export interface CompleteChatReplyInput {
  runId: string;
  claimVersion: Date;
  content: string;
}

export interface CompleteChatGenerationInput {
  runId: string;
  claimVersion: Date;
  type: AssetKind;
  config: AiGenerationConfig;
}

export interface MessageRepository {
  createForConversation(
    input: CreateMessageForConversationInput,
  ): Promise<CreateMessageForConversationResult>;
  listByConversation(
    input: ListMessagesInput,
  ): Promise<CursorPage<Message, MessageListCursor> | null>;
  getResponse(input: GetMessageResponseInput): Promise<MessageResponseState | null>;
  claimChat(input: ClaimChatInput): Promise<ClaimChatResult>;
  completeChatReply(input: CompleteChatReplyInput): Promise<ChatTurn | null>;
  completeChatGeneration(input: CompleteChatGenerationInput): Promise<ChatTurn | null>;
  failChat(runId: string, claimVersion: Date): Promise<void>;
}
