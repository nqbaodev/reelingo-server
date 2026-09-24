# Raw SQL

Use raw SQL deliberately, not as a default replacement for Prisma Client.

## When Raw SQL Is Appropriate

- One PostgreSQL statement avoids a race window or an extra query, such as
  `DELETE ... WHERE ... NOT EXISTS (...) RETURNING ...`.
- PostgreSQL-specific features are required: `RETURNING`, `ON CONFLICT`,
  `VALUES` tables for bulk updates, CTEs, advisory locks, window functions,
  JSONB operators, array operators, partial indexes, or query-plan inspection.
- A Prisma query would fetch substantially more data than the database needs to
  process.

## Safety Rules

- Prefer Prisma's tagged-template `$queryRaw` / `$executeRaw` and `Prisma.sql` /
  `Prisma.join` helpers. Avoid `$queryRawUnsafe` and `$executeRawUnsafe` unless
  every interpolated identifier and fragment is static or allowlisted.
- Never build SQL by concatenating untrusted strings. Values must be parameters;
  identifiers must be static or selected from a narrow allowlist.
- Type raw query results with a local interface whose field names match returned
  aliases. Keep this type in infrastructure unless presentation directly owns the
  raw query output.
- For a query expected to return zero or one row, destructure the result and handle
  the missing-row branch before reading any field. Avoid expressions such as
  `rows[0]?.field`, which conflate "no row returned" with an invalid or missing
  field. If multiple rows would violate the contract, enforce or validate that
  cardinality instead of silently selecting the first row.
- Use explicit aliases when returning snake_case database columns to camelCase
  TypeScript fields.
- When raw SQL bypasses Prisma mapping, validate or constrain database values at
  the adapter boundary before returning feature-owned types.

## PostgreSQL Notes

- `RETURNING` is useful when modified rows must be identified without a follow-up
  query. It returns the deleted row values for `DELETE`.
- For value lists, keep inputs bounded. A small bounded `IN (${Prisma.join(ids)})`
  list is acceptable; for larger or unbounded batches, prefer a typed array,
  temporary table, or `VALUES` relation and measure.
- Avoid long SQL strings hidden inside controllers or use cases. Raw SQL belongs
  in infrastructure adapters or migration files.
