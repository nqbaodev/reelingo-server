import type { Message } from "@/features/messages/domain";

export const AiGenerationEventType = {
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type AiGenerationEvent =
  | {
      type: typeof AiGenerationEventType.COMPLETED;
      userId: number;
      generationId: string;
      message: Message;
    }
  | {
      type: typeof AiGenerationEventType.FAILED;
      userId: number;
      generationId: string;
      conversationId: string;
      triggerMessageId: string;
    };

export type AiGenerationEventListener = (
  event: AiGenerationEvent,
) => void | Promise<void>;

export interface AiGenerationEvents {
  publish(event: AiGenerationEvent): void;
  subscribe(userId: number, listener: AiGenerationEventListener): () => void;
}
