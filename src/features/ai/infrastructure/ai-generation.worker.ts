import { setTimeout as delay } from "node:timers/promises";
import type { ProcessAiGenerationUseCase } from "../application";

interface WorkerLogger {
  error(bindings: { err: unknown }, message: string): void;
}

export class AiGenerationWorker {
  private abortController: AbortController | undefined;
  private running: Promise<void> | undefined;

  constructor(
    private readonly processGeneration: ProcessAiGenerationUseCase,
    private readonly pollIntervalMs: number,
    private readonly logger: WorkerLogger,
  ) {}

  start(): void {
    if (this.running) return;

    this.abortController = new AbortController();
    this.running = this.run(this.abortController.signal);
  }

  async stop(): Promise<void> {
    this.abortController?.abort();
    await this.running;
    this.abortController = undefined;
    this.running = undefined;
  }

  private async run(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      let processed = false;
      try {
        processed = await this.processGeneration.execute(signal);
      } catch (err) {
        if (!signal.aborted) {
          this.logger.error({ err }, "AI generation worker failed to process a job");
        }
      }

      if (processed || signal.aborted) continue;
      try {
        await delay(this.pollIntervalMs, undefined, { signal });
      } catch {
        // Aborting the worker interrupts idle polling.
      }
    }
  }
}
