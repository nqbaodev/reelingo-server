import type {
  AiGenerationEvent,
  AiGenerationEventListener,
  AiGenerationEvents,
} from "../../application";

export class InMemoryAiGenerationEvents implements AiGenerationEvents {
  private readonly listeners = new Map<number, Set<AiGenerationEventListener>>();

  publish(event: AiGenerationEvent): void {
    const listeners = this.listeners.get(event.userId);
    if (!listeners) return;

    for (const listener of listeners) {
      void Promise.resolve(listener(event)).catch(() => undefined);
    }
  }

  subscribe(userId: number, listener: AiGenerationEventListener): () => void {
    const listeners = this.listeners.get(userId) ?? new Set();
    listeners.add(listener);
    this.listeners.set(userId, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(userId);
      }
    };
  }
}
