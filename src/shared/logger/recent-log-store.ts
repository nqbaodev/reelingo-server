import pino from "pino";

export const ADMIN_LOG_LEVELS = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
] as const;

const LOG_LEVEL_NAMES = new Set<string>(ADMIN_LOG_LEVELS);
const MAX_RETAINED_LOG_LINE_BYTES = 64 * 1024;

export type AdminLogLevel = (typeof ADMIN_LOG_LEVELS)[number];

export interface RecentLogEntry {
  id: number;
  timestamp: string;
  level: AdminLogLevel;
  message: string;
  attributes: Record<string, unknown>;
}

export interface RecentLogReader {
  listRecent(): RecentLogEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toLevel(value: unknown): AdminLogLevel | undefined {
  const label = typeof value === "number" ? pino.levels.labels[value] : String(value);
  return label && LOG_LEVEL_NAMES.has(label) ? (label as AdminLogLevel) : undefined;
}

function toTimestamp(value: unknown): string | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

function parseLogLine(line: string): Omit<RecentLogEntry, "id"> | undefined {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return undefined;
  }
  if (!isRecord(value)) return undefined;

  const level = toLevel(value.level);
  const timestamp = toTimestamp(value.time);
  if (!level || !timestamp) return undefined;

  const { level: _level, time: _time, msg, ...attributes } = value;
  return {
    timestamp,
    level,
    message: typeof msg === "string" ? msg : "",
    attributes,
  };
}

/** Stores a bounded, process-local view of already-redacted Pino output. */
export class RecentLogStore implements RecentLogReader {
  private readonly entries: Array<RecentLogEntry | undefined>;
  private nextIndex = 0;
  private size = 0;
  private nextId = 1;

  constructor(private readonly capacity: number) {
    if (!Number.isSafeInteger(capacity) || capacity <= 0) {
      throw new RangeError("Recent log capacity must be a positive integer");
    }
    this.entries = new Array<RecentLogEntry | undefined>(capacity);
  }

  write(line: string): void {
    if (Buffer.byteLength(line, "utf8") > MAX_RETAINED_LOG_LINE_BYTES) return;

    const parsed = parseLogLine(line.trim());
    if (!parsed) return;

    this.entries[this.nextIndex] = { id: this.nextId, ...parsed };
    this.nextId += 1;
    this.nextIndex = (this.nextIndex + 1) % this.capacity;
    this.size = Math.min(this.size + 1, this.capacity);
  }

  listRecent(): RecentLogEntry[] {
    const result: RecentLogEntry[] = [];

    for (let offset = 0; offset < this.size; offset += 1) {
      const index = (this.nextIndex - 1 - offset + this.capacity) % this.capacity;
      const entry = this.entries[index];
      if (!entry) continue;
      result.push(entry);
    }

    return result;
  }
}
