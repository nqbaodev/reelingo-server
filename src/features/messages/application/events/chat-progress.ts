import type { Message, MessageGeneration } from "../../domain";
import type { ChatTurn } from "../../infrastructure";
import type { Conversation } from "@/features/conversations/domain";

export const ChatProgressEventType = {
  MESSAGE_CREATED: "messageCreated",
  STARTED: "started",
  TEXT_DELTA: "textDelta",
  GENERATION_QUEUED: "generationQueued",
  COMPLETED: "completed",
} as const;

export type ChatProgressEvent =
  | {
      type: typeof ChatProgressEventType.MESSAGE_CREATED;
      message: Message;
      createdConversation: Conversation | null;
      runId: string;
    }
  | {
      type: typeof ChatProgressEventType.STARTED;
      runId: string;
    }
  | {
      type: typeof ChatProgressEventType.TEXT_DELTA;
      delta: string;
    }
  | {
      type: typeof ChatProgressEventType.GENERATION_QUEUED;
      generation: MessageGeneration;
    }
  | {
      type: typeof ChatProgressEventType.COMPLETED;
      turn: ChatTurn;
      runId: string;
    };

export interface ChatProgressObserver {
  /** Delivery is best-effort and must resolve after the client disconnects. */
  publish(event: ChatProgressEvent): Promise<void>;
}
