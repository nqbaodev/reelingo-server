const NULL_BYTE = "\0";

/** Reports whether text contains a null byte, which PostgreSQL text rejects. */
export function containsNullByte(value: string): boolean {
  return value.includes(NULL_BYTE);
}

/**
 * Removes null bytes, trims whitespace, and limits text by Unicode code points.
 * @throws RangeError when maxLength is not a non-negative safe integer.
 */
export function normalizeBoundedText(value: string, maxLength: number): string {
  if (!Number.isSafeInteger(maxLength) || maxLength < 0) {
    throw new RangeError("Text maximum length must be a non-negative safe integer");
  }

  return Array.from(value.replaceAll(NULL_BYTE, "").trim())
    .slice(0, maxLength)
    .join("")
    .trim();
}
