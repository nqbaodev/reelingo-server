---
name: postgres-db-prisma
description: Review or implement PostgreSQL, Prisma, migrations, indexes, transactions, raw SQL, connection pooling, and database performance work in reelingo-server. Use with backend-dev-guidelines for repository layer placement and verification.
---

# PostgreSQL, DB, and Prisma Guidance

Use this skill for database-centered backend work: Prisma schema or migration
changes, repository query design, raw SQL, transaction boundaries, connection
pooling, indexing, pagination, data cleanup, and Postgres performance reviews.

Apply this together with
[`backend-dev-guidelines`](../backend-dev-guidelines/SKILL.md). That skill owns
feature/layer placement; this skill owns database-specific judgment.
When both skills apply, read `backend-dev-guidelines` first, then this skill,
then only the database rule files relevant to the current task.

## Default Posture

- Prefer Prisma Client for ordinary CRUD, relation checks, pagination queries,
  and transaction orchestration that Prisma expresses clearly.
- Use raw SQL only when the PostgreSQL capability is materially better or not
  expressible through Prisma without extra queries, race windows, or excessive
  data transfer.
- Do not introduce a second database client (`pg`, `postgres`, `postgrejs`) into
  app code while Prisma is the wired persistence adapter unless the task explicitly
  changes the database access strategy. Research those clients as external context,
  not as a reason to mix client pools inside a feature.
- Treat every schema, index, transaction, or query-performance claim as needing
  real evidence: generated Prisma client, inspected migration SQL, and a real
  PostgreSQL check where behavior or performance matters.

## Read The Relevant Rule

- For raw SQL, `DELETE ... RETURNING`, dynamic query fragments, and SQL injection
  boundaries, read [rules/raw-sql.md](rules/raw-sql.md).
- For schema, migrations, constraints, indexes, and query plans, read
  [rules/schema-indexes-performance.md](rules/schema-indexes-performance.md).
- For transactions, concurrency, connection pools, and long-running work, read
  [rules/transactions-connections.md](rules/transactions-connections.md).

## Repository Fit

- Repository interfaces stay in the feature's `infrastructure` layer and must not
  expose Prisma, SQL driver, or raw provider result types.
- A use case may depend on repository/storage contracts, but Prisma clients,
  transactions, and raw SQL stay inside infrastructure adapters.
- When changing API-visible database behavior, update the owning docs and OpenAPI
  surfaces alongside code.
- If this skill seems to conflict with `rule.md`, `docs/backend.md`,
  `docs/architecture.md`, or `docs/workflow.md`, follow the project docs and
  update the stale instruction rather than silently choosing one.
