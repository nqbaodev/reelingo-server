import { z } from "zod";

/** Public instant representation: Unix epoch milliseconds in JSON. */
export const unixTimestampMillisecondsSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
