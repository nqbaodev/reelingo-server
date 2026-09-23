import type { ServerResponse } from "node:http";

const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000;
const EVENT_NAME_LINE_BREAK = /[\r\n]/u;

type FlushableServerResponse = ServerResponse & { flush?: () => void };

export interface ServerSentEventStreamOptions {
  heartbeatIntervalMs?: number;
}

enum EventStreamState {
  IDLE = "idle",
  OPEN = "open",
  CLOSED = "closed",
}

function createJsonEventFrame(event: string, data: unknown): string {
  if (!event || EVENT_NAME_LINE_BREAK.test(event)) {
    throw new TypeError("SSE event name must be a non-empty single line");
  }

  const serializedData = JSON.stringify(data);
  if (serializedData === undefined) {
    throw new TypeError("SSE event data must be JSON serializable");
  }

  return `event: ${event}\ndata: ${serializedData}\n\n`;
}

/** Owns one HTTP SSE response, including ordered writes and disconnect cleanup. */
export class ServerSentEventStream {
  private state: EventStreamState;
  private readonly heartbeatIntervalMs: number;
  private heartbeat: NodeJS.Timeout | undefined;
  private pendingWrite = Promise.resolve();

  constructor(
    private readonly response: FlushableServerResponse,
    options: ServerSentEventStreamOptions = {},
  ) {
    this.heartbeatIntervalMs =
      options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
    if (
      !Number.isSafeInteger(this.heartbeatIntervalMs) ||
      this.heartbeatIntervalMs <= 0
    ) {
      throw new RangeError("SSE heartbeat interval must be a positive integer");
    }

    this.state =
      response.destroyed || response.writableEnded
        ? EventStreamState.CLOSED
        : EventStreamState.IDLE;
    response.on("close", () => this.markClosed());
    response.on("error", () => this.markClosed());
  }

  get isIdle(): boolean {
    return this.state === EventStreamState.IDLE;
  }

  get isClosed(): boolean {
    return this.state === EventStreamState.CLOSED;
  }

  sendJson(event: string, data: unknown): Promise<void> {
    if (this.isClosed) return Promise.resolve();

    return this.enqueue(createJsonEventFrame(event, data));
  }

  async end(): Promise<void> {
    this.stopHeartbeat();
    await this.pendingWrite;
    if (this.isClosed || this.response.writableEnded) return;

    this.state = EventStreamState.CLOSED;
    try {
      this.response.end();
    } catch {
      this.markClosed();
    }
  }

  private enqueue(frame: string): Promise<void> {
    if (this.isClosed) return Promise.resolve();
    try {
      this.open();
    } catch {
      this.markClosed();
      return Promise.resolve();
    }
    this.pendingWrite = this.pendingWrite.then(() => this.write(frame));
    return this.pendingWrite;
  }

  private open(): void {
    if (!this.isIdle) return;

    this.state = EventStreamState.OPEN;
    this.response.statusCode = 200;
    this.response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    this.response.setHeader(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate, max-age=0, no-transform",
    );
    this.response.setHeader("Pragma", "no-cache");
    this.response.setHeader("Expires", "0");
    this.response.setHeader("X-Accel-Buffering", "no");
    this.response.flushHeaders();
    this.heartbeat = setInterval(() => {
      void this.enqueue(": ping\n\n");
    }, this.heartbeatIntervalMs);
    this.heartbeat.unref();
  }

  private async write(frame: string): Promise<void> {
    if (this.isClosed || this.response.destroyed || this.response.writableEnded) {
      this.markClosed();
      return;
    }

    try {
      const canContinue = this.response.write(frame);
      this.response.flush?.();
      if (!canContinue) {
        await this.waitUntilWritableOrClosed();
      }
    } catch {
      this.markClosed();
    }
  }

  private waitUntilWritableOrClosed(): Promise<void> {
    return new Promise((resolve) => {
      const finish = () => {
        this.response.off("drain", finish);
        this.response.off("close", finish);
        this.response.off("error", finish);
        resolve();
      };

      this.response.once("drain", finish);
      this.response.once("close", finish);
      this.response.once("error", finish);
      if (this.isClosed || this.response.destroyed) finish();
    });
  }

  private markClosed(): void {
    this.state = EventStreamState.CLOSED;
    this.stopHeartbeat();
  }

  private stopHeartbeat(): void {
    if (!this.heartbeat) return;

    clearInterval(this.heartbeat);
    this.heartbeat = undefined;
  }
}
