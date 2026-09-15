import { z } from "zod";
import {
  DEFAULT_PAGE_SIZE,
  MAX_CURSOR_LENGTH,
  MAX_PAGE_SIZE,
} from "@/config";

export const paginationLimitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(MAX_PAGE_SIZE)
  .default(DEFAULT_PAGE_SIZE);

export const cursorTokenSchema = z.string().trim().min(1).max(MAX_CURSOR_LENGTH);

export interface CursorPage<TItem, TCursor> {
  items: TItem[];
  nextCursor: TCursor | null;
}

/** Public list response after the feature cursor has been serialized. */
export type CursorListResponse<TItem> = CursorPage<TItem, string>;

/**
 * Converts a `limit + 1` result set into one cursor page. The extra item is
 * used only to determine whether another page exists.
 */
export function createCursorPage<TItem, TCursor>(
  fetchedItems: readonly TItem[],
  limit: number,
  selectCursor: (item: TItem) => TCursor,
): CursorPage<TItem, TCursor> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("Cursor page limit must be a positive integer");
  }

  const hasMore = fetchedItems.length > limit;
  const items = fetchedItems.slice(0, limit);
  const lastItem = items.at(-1);

  return {
    items,
    nextCursor: hasMore && lastItem ? selectCursor(lastItem) : null,
  };
}

export function encodeCursor(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/** Creates a Zod schema that decodes an opaque cursor and validates its payload. */
export function createCursorSchema<T>(payloadSchema: z.ZodType<T>) {
  return cursorTokenSchema.transform((token, context) => {
    try {
      const payload: unknown = JSON.parse(
        Buffer.from(token, "base64url").toString("utf8"),
      );
      const result = payloadSchema.safeParse(payload);
      if (result.success) {
        return result.data;
      }
    } catch {
      // The validation issue below intentionally hides cursor parsing details.
    }

    context.addIssue({ code: "custom" });
    return z.NEVER;
  });
}
