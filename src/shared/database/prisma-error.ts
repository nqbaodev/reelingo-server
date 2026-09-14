const UNIQUE_VIOLATION = "P2002";

/** Identifies a Prisma unique constraint failure without deciding its outcome. */
export function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === UNIQUE_VIOLATION
  );
}
