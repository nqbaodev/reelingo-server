const UNIQUE_VIOLATION = "P2002";
const RECORD_NOT_FOUND = "P2025";

/** Identifies a Prisma unique constraint failure without deciding its outcome. */
export function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === UNIQUE_VIOLATION
  );
}

/** Identifies a Prisma operation that targeted no existing record. */
export function isPrismaRecordNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === RECORD_NOT_FOUND
  );
}
