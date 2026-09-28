/** Canonical representation for date-only values. */
export const DATE_ONLY_FORMAT = "YYYY-MM-DD";

const DATE_ONLY_LENGTH = DATE_ONLY_FORMAT.length;
const UTC_MIDNIGHT_SUFFIX = "T00:00:00.000Z";

/** Formats a Date using DATE_ONLY_FORMAT. */
export function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, DATE_ONLY_LENGTH);
}

/** Converts a validated DATE_ONLY_FORMAT value to a UTC Date for persistence. */
export function fromDateOnlyString(value: string): Date {
  return new Date(`${value}${UTC_MIDNIGHT_SUFFIX}`);
}
