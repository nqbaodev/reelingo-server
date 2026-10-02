export const SECOND_MS = 1_000;
export const MINUTE_MS = 60 * SECOND_MS;

/** Narrows an unknown value to a Date with a finite timestamp. */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/** Converts a date to whole Unix seconds, rounding down. */
export function toSeconds(date: Date): number {
  return Math.floor(date.getTime() / SECOND_MS);
}
