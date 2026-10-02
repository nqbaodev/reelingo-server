import { getErrorCode } from "@/utils";

const UNIQUE_VIOLATION = "P2002";
const RECORD_NOT_FOUND = "P2025";

/** Identifies a Prisma unique constraint failure without deciding its outcome. */
export function isPrismaUniqueViolation(err: unknown): boolean {
  return getErrorCode(err) === UNIQUE_VIOLATION;
}

/** Identifies a Prisma operation that targeted no existing record. */
export function isPrismaRecordNotFound(err: unknown): boolean {
  return getErrorCode(err) === RECORD_NOT_FOUND;
}
