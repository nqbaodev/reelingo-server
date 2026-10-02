import {
  MAX_MESSAGE_ASSET_COUNT,
  MAX_MESSAGE_CONTENT_LENGTH,
} from "@/application/constants";
import { normalizeBoundedText } from "@/utils";
import type { AssetStorage } from "@/application/interfaces/storage/asset.storage";
import type { MediaGenerator, TextGenerator } from "@/application/interfaces/ai/ai.types";
import type {
  AiGenerationRepository,
  ClaimedAiGeneration,
} from "@/application/interfaces/repositories/ai-generation.repository";

function normalizeCompletionText(content: string): string {
  const bounded = normalizeBoundedText(content, MAX_MESSAGE_CONTENT_LENGTH);
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
    private readonly generationRepository: AiGenerationRepository,
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
        const renewedVersion = await this.generationRepository.renewClaim(
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

export class ProcessNextAiGenerationUseCase {
  constructor(
    private readonly generationRepository: AiGenerationRepository,
    private readonly mediaGenerator: MediaGenerator,
    private readonly textGenerator: TextGenerator,
    private readonly assetStorage: AssetStorage,
    private readonly leaseMs: number,
  ) {}

  async execute(signal: AbortSignal): Promise<boolean> {
    const generation = await this.generationRepository.claimNext({
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
      this.generationRepository,
      generation.id,
      generation.claimVersion,
      Math.max(1, Math.floor(this.leaseMs / 3)),
    );
    const storedKeys: string[] = [];

    try {
      if (!generation.prompt) {
        throw new Error("AI generation requires a text prompt");
      }

      const [outputs, completionText] = await Promise.all([
        this.mediaGenerator.generate({
          generationId: generation.id,
          prompt: generation.prompt,
          type: generation.type,
          config: generation.config,
          route: generation.route,
          signal,
        }),
        this.textGenerator
          .generateText({
            prompt: generation.prompt,
            type: generation.type,
            outputCount: generation.config.outputCount,
            signal,
          })
          .then(normalizeCompletionText)
          .catch(() => null),
      ]);
      if (outputs.length < 1 || outputs.length > MAX_MESSAGE_ASSET_COUNT) {
        throw new Error("AI media provider returned an invalid output count");
      }
      const storedMedia = [];
      for (const output of outputs) {
        const storageKey = await this.assetStorage.storeGenerated({
          userId: generation.userId,
          bytes: output.bytes,
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

      const message = await this.generationRepository.completeClaim({
        id: generation.id,
        claimVersion,
        content: completionText,
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
    } catch (err) {
      const claimVersion = await lease.stop();
      const secondaryFailures = await this.deleteStoredMedia(storedKeys);
      if (!signal.aborted && claimVersion) {
        try {
          await this.generationRepository.failClaim(generation.id, claimVersion);
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
      storageKeys.map((storageKey) => this.assetStorage.delete(storageKey)),
    );
    return results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason);
  }
}
