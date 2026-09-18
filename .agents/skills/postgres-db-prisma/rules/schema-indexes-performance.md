# Schema, Indexes, And Performance

Database optimization starts from observed workload, not checklist-driven index
creation.

## Schema And Migrations

- Update `prisma/schema.prisma` and add a new migration together. Do not edit a
  shared/applied migration to hide a new schema decision.
- Prefer database constraints for invariants that must hold under concurrency:
  foreign keys, uniqueness, check constraints, `NOT NULL`, and referential actions.
- Use PostgreSQL types intentionally. Store instants as `TIMESTAMPTZ(3)` as the
  project already does; use `DATE` for date-only values.
- Inspect migration SQL for destructive operations, locking risk, default value
  rewrites, and accidental nullable/required changes.

## Indexes

- Match indexes to actual `WHERE`, `ORDER BY`, join, and pagination patterns.
- For cursor pagination, align the index with both ownership/filter columns and
  the stable sort keys. Mixed `ASC`/`DESC` order matters in multicolumn B-tree
  indexes when the query needs mixed ordering.
- Do not add a standalone `DESC` single-column index solely for descending sort;
  PostgreSQL can scan ordinary B-tree indexes backward. Mixed multicolumn order is
  the case that can justify explicit order.
- Consider partial indexes only when the predicate is stable, selective, and
  appears in the query shape. Do not use partial indexes as a substitute for
  partitioning or unclear workload design.
- After expression indexes or substantial data changes, run `ANALYZE` or account
  for autovacuum/statistics timing before judging plans.

## Performance Evidence

- Use `EXPLAIN` to inspect plans and `EXPLAIN ANALYZE` only on safe local or
  disposable data, because it executes the statement.
- Compare the same workload before and after a change. Report row counts,
  relevant indexes, plan shape, and measured timing when making performance
  claims.
- Avoid optimizing solely from ORM intuition. Prisma query shape, selected fields,
  relation loading, and database indexes all affect the actual plan.

