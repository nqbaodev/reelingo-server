import type { MediaType } from "@/features/media/domain";
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

export interface AiGenerationRepository {
  /** Atomically claims one pending or stale generation; returns null when none is eligible. */
  claimNext(input: ClaimNextAiGenerationInput): Promise<ClaimedAiGeneration | null>;
  /** Extends the current lease and returns its new version, or null after lease loss. */
  renewClaim(id: string, claimVersion: Date): Promise<Date | null>;
  /** Marks the current lease failed; returns false when the caller no longer owns it. */
  failClaim(id: string, claimVersion: Date): Promise<boolean>;
}
