import type { MediaType } from "@/features/media/domain";
import type { Message } from "@/features/messages/domain";
import type { AiGenerationConfig } from "../domain";

export interface ClaimedAiGeneration {
  id: string;
  triggerMessageId: string;
  conversationId: string;
  userId: number;
  prompt: string | null;
  type: MediaType;
  config: AiGenerationConfig;
  claimVersion: Date;
}

export interface ClaimNextAiGenerationInput {
  staleBefore: Date;
}

export interface GeneratedMediaRecord {
  storageKey: string;
  mimeType: string;
}

export interface CompleteAiGenerationInput {
  id: string;
  claimVersion: Date;
  content: string | null;
  media: readonly GeneratedMediaRecord[];
}

export interface AiGenerationRepository {
  /** Atomically claims one pending or stale generation; returns null when none is eligible. */
  claimNext(input: ClaimNextAiGenerationInput): Promise<ClaimedAiGeneration | null>;
  /** Extends the current lease and returns its new version, or null after lease loss. */
  renewClaim(id: string, claimVersion: Date): Promise<Date | null>;
  /** Atomically creates the result message and completes the owned claim. */
  completeClaim(input: CompleteAiGenerationInput): Promise<Message | null>;
  /** Marks the current lease failed; returns false when the caller no longer owns it. */
  failClaim(id: string, claimVersion: Date): Promise<boolean>;
}
