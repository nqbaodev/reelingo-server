import { MAX_MESSAGE_CONTENT_LENGTH, MAX_MESSAGE_MEDIA_COUNT } from "@/config";
import type { MediaStorage } from "@/features/media/infrastructure";
import type { AiGenerationEvents } from "./ai-generation-events";
import { AiGenerationEventType } from "./ai-generation-events";
import type {
  AiGenerationRepository,
  ClaimedAiGeneration,
  MediaGenerationClient,
} from "../infrastructure";

function normalizeCompletionText(content: string): string {
  const normalized = content.replaceAll(String.fromCharCode(0), "").trim();
  const bounded = Array.from(normalized)
    .slice(0, MAX_MESSAGE_CONTENT_LENGTH)
    .join("")
    .trim();
  if (!bounded) {
    throw new Error("AI generation completion text is empty");
  }

  return bounded;
}

class AiGenerationClaimLease {
  private claimVersion: Date;
  private active = true;
  private lost = false;
  private pendingRenewal = Promise.resolve();
  private readonly timer: NodeJS.Timeout;

  constructor(
    private readonly generations: AiGenerationRepository,
    generationId: string,
    claimVersion: Date,
    renewalIntervalMs: number,
  ) {
    this.generationId = generationId;
    this.claimVersion = claimVersion;
    this.timer = setInterval(() => this.scheduleRenewal(), renewalIntervalMs);
    this.timer.unref();
  }

  private readonly generationId: string;

  async stop(): Promise<Date | null> {
    this.active = false;
    clearInterval(this.timer);
    await this.pendingRenewal;
    return this.lost ? null : this.claimVersion;
  }

  private scheduleRenewal(): void {
    this.pendingRenewal = this.pendingRenewal.then(async () => {
      if (!this.active || this.lost) return;

      try {
        const renewedVersion = await this.generations.renewClaim(
          this.generationId,
          this.claimVersion,
        );
        if (!renewedVersion) {
          this.lost = true;
          return;
        }

        this.claimVersion = renewedVersion;
      } catch {
        this.lost = true;
      }
    });
  }
}

export class ProcessAiGenerationUseCase {
  constructor(
    private readonly generations: AiGenerationRepository,
    private readonly generator: MediaGenerationClient,
    private readonly storage: MediaStorage,
    private readonly events: AiGenerationEvents,
    private readonly leaseMs: number,
  ) {}

  async execute(signal: AbortSignal): Promise<boolean> {
    const generation = await this.generations.claimNext({
      staleBefore: new Date(Date.now() - this.leaseMs),
    });
    if (!generation) return false;

    await this.process(generation, signal);
    return true;
  }

  private async process(
    generation: ClaimedAiGeneration,
    signal: AbortSignal,
  ): Promise<void> {
    const lease = new AiGenerationClaimLease(
      this.generations,
      generation.id,
      generation.claimVersion,
      Math.max(1, Math.floor(this.leaseMs / 3)),
    );
    const storedKeys: string[] = [];

    try {
      if (!generation.prompt) {
        throw new Error("AI generation requires a text prompt");
      }

      const outputs = await this.generator.generate({
        generationId: generation.id,
        prompt: generation.prompt,
        type: generation.type,
        config: generation.config,
        signal,
      });
      if (outputs.length < 1 || outputs.length > MAX_MESSAGE_MEDIA_COUNT) {
        throw new Error("AI media provider returned an invalid output count");
      }
      const content = normalizeCompletionText(
        await this.generator.generateCompletionText({
          prompt: generation.prompt,
          type: generation.type,
          outputCount: outputs.length,
          signal,
        }),
      );
      const storedMedia = [];
      for (const output of outputs) {
        const storageKey = await this.storage.storeGenerated({
          bytes: output.bytes,
          type: generation.type,
          mimeType: output.mimeType,
        });
        storedKeys.push(storageKey);
        storedMedia.push({ storageKey, mimeType: output.mimeType });
      }

      const claimVersion = await lease.stop();
      if (!claimVersion) {
        const cleanupFailures = await this.deleteStoredMedia(storedKeys);
        if (cleanupFailures.length > 0) {
          throw new AggregateError(
            cleanupFailures,
            "Failed to clean up media after losing an AI generation claim",
          );
        }
        return;
      }

      const message = await this.generations.completeClaim({
        id: generation.id,
        claimVersion,
        content,
        media: storedMedia,
      });
      if (!message) {
        const cleanupFailures = await this.deleteStoredMedia(storedKeys);
        if (cleanupFailures.length > 0) {
          throw new AggregateError(
            cleanupFailures,
            "Failed to clean up media after losing an AI generation claim",
          );
        }
        return;
      }

      this.events.publish({
        type: AiGenerationEventType.COMPLETED,
        userId: generation.userId,
        generationId: generation.id,
        message,
      });
    } catch (err) {
      const claimVersion = await lease.stop();
      const secondaryFailures = await this.deleteStoredMedia(storedKeys);
      if (!signal.aborted && claimVersion) {
        try {
          const failed = await this.generations.failClaim(
            generation.id,
            claimVersion,
          );
          if (failed) {
            this.events.publish({
              type: AiGenerationEventType.FAILED,
              userId: generation.userId,
              generationId: generation.id,
              conversationId: generation.conversationId,
              triggerMessageId: generation.triggerMessageId,
            });
          }
        } catch (failureError) {
          secondaryFailures.push(failureError);
        }
      }
      if (secondaryFailures.length > 0) {
        throw new AggregateError(
          secondaryFailures,
          "AI generation failed and recovery was incomplete",
          { cause: err },
        );
      }
      throw err;
    }
  }

  private async deleteStoredMedia(storageKeys: readonly string[]): Promise<unknown[]> {
    const results = await Promise.allSettled(
      storageKeys.map((storageKey) => this.storage.delete(storageKey)),
    );
    return results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason);
  }
}
