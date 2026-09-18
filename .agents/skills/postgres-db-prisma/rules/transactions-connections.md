# Transactions And Connections

Use the smallest transaction boundary that preserves the business invariant.

## Transactions And Concurrency

- Put transaction boundaries in repository/infrastructure contracts when the
  operation needs atomic database work. Do not leak Prisma transaction clients to
  use cases or controllers.
- Keep external network calls and filesystem work outside long-running database
  transactions unless there is a deliberate recovery plan.
- Prefer one atomic database statement when it naturally expresses the invariant,
  such as conditional delete/update with `RETURNING`.
- For multi-step writes, verify missing/non-owned resources inside the same
  transaction when the distinction affects ownership or privacy.
- Choose explicit isolation levels only for a demonstrated anomaly. Document the
  anomaly, expected contention, retry behavior, and verification.

## Connection Pooling

- This project uses Prisma and `@prisma/adapter-pg`; do not add an independent
  `pg` or `postgres` pool inside feature code without an architecture decision.
- Pool timeouts usually indicate too many concurrent queries, slow queries, or
  mismatched per-instance connection limits. Tune query duration and pool sizing
  before simply increasing timeouts.
- A web app should share one pool/client per process through the existing
  database composition root. Creating pools per request defeats pooling and can
  exhaust PostgreSQL connections.
- If pool behavior changes, document the per-process pool size, expected app
  instance count, and database/server pool limit.

## Verification

- For Prisma schema changes: run `npm run prisma:generate`; run migrations against
  real local/disposable PostgreSQL when possible.
- For transaction/concurrency behavior: prefer integration tests or manual
  two-session checks against PostgreSQL. Static checks do not prove isolation,
  locking, or constraint behavior.

