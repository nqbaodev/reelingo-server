# Engineering workflow

Use this workflow to move a scoped change from discovery to evidence. Scale the
detail and checks to the change; small mechanical work does not require the same
artifacts as an API, schema, auth, or cross-repository change.

## Find context

Start with [AGENTS.md](../AGENTS.md) and [rule.md](../rule.md). Read the relevant
reference rather than loading every document:

| Task | Reference |
| --- | --- |
| Feature ownership and the dependency rule | [Architecture](architecture.md) |
| Adding a feature | [Architecture → Add a feature](architecture.md#add-a-feature) |
| TypeScript style and naming | [Backend → Language and coding style](backend.md#language-and-coding-style) |
| SOLID, contracts, and design patterns | [Architecture → SOLID and design patterns](architecture.md#solid-and-design-patterns) |
| Entity mappers and HTTP presenters | [Architecture → Entity mapping](architecture.md#entity-mapping) |
| Shared services and ownership | [Architecture](architecture.md#services-and-shared-ownership) |
| Helpers, utilities, and reuse | [Architecture](architecture.md#shared-helpers-and-utilities) |
| Request validation, errors, HTTP response shape | [Backend](backend.md) |
| Test conventions | [Backend → Testing](backend.md#testing) |
| Async work, transactions, and races | [Backend](backend.md#async-operations-and-error-boundaries) |
| Prisma, PostgreSQL, raw SQL, migrations, indexes, query plans, and connection pooling | [PostgreSQL/Prisma skill](../.agents/skills/postgres-db-prisma/SKILL.md) plus [Backend → Persistence and concurrency](backend.md#persistence-and-concurrency) |
| Secrets and authentication | [Backend](backend.md#authentication-and-secrets) |
| Frontend API compatibility | [App integration](app-integration.md) |
| Instruction ownership and skills | [Docs index](README.md) |

## Workflow

### 1. Discover

Read `AGENTS.md`, `rule.md`, and only the task-specific references above. Inspect
the owning feature, existing contracts, tests, and working-tree changes. Reproduce
a reported defect before changing behavior when feasible, and distinguish existing
failures from failures introduced by the change.

### 2. Define

State the requested behavior, affected scope, observable acceptance criteria, and
evidence needed to verify it. Resolve decisions that materially change behavior;
do not invent endpoints, fields, integrations, or requirements.

### 3. Design

Identify the owning feature and assign work to the correct layers. Define relevant
inputs, outputs, errors, side effects, trust boundaries, database constraints, and
concurrency behavior. For API work, identify every affected validator, presenter,
OpenAPI entry, and consumer. For schema work, inspect data and migration risk before
application code depends on the new shape.
For raw SQL or performance work, define why Prisma Client is insufficient, the
PostgreSQL behavior being used, and the measured query shape before editing.

### 4. Implement

Make the smallest complete change. Keep functions cohesive, dependencies explicit,
and feature-specific policy out of shared helpers. Update code, migrations, OpenAPI,
and owning documentation together when the behavior requires them. Automated-test
authoring is a separate, opt-in scope: do not create or modify test files unless the
user explicitly requests tests in the current task. Remove unused code introduced
by the change and leave unrelated work intact.

### 5. Verify

Select evidence from the table below. Inspect failures, fix their cause, and rerun
affected checks. Do not weaken checks or delete assertions merely to get a pass.
Use synthetic inputs and local/disposable services; do not depend on production
credentials or data.

### 6. Review

Review the final diff for scope, layer boundaries, function names/responsibilities,
contract consistency, error exposure, security ownership, database races, unused
code, and stale documentation. Confirm that measured claims have evidence.

### 7. Handoff

Report the resulting behavior, checks actually run, and specific remaining gaps.
Passing static checks is not evidence of untested HTTP, database, security,
performance, or companion-app behavior.

## Task profiles

Use these as starting points, then add checks required by the actual risk:

| Task | Expected path |
| --- | --- |
| Mechanical rename/extraction | Inspect callers → edit → check imports/types/lint; avoid tests that mirror the rename |
| Bug fix | Reproduce → identify cause/boundary → fix → run affected existing checks; add a regression test only when requested |
| Use-case/domain behavior | Define invariant and failures → implement in owning layer → run relevant existing tests and `npm run check` |
| HTTP/API contract | Define request/response/errors → update all contract surfaces → exercise existing supertest/manual behavior → `npm run check` |
| Prisma schema/data | Assess data/destructive risk → schema and migration → generate → real-database constraint/migration check → `npm run verify` when cross-layer |
| Raw SQL or repository query optimization | State why Prisma Client is insufficient or slow → keep SQL in infrastructure → parameterize values and type returned rows → inspect `EXPLAIN`/real DB behavior where relevant → `npm run check` |
| Index or database performance | State workload and current query plan/latency → change schema/migration or query → compare the same workload with `EXPLAIN`/measurement → run correctness checks |
| Auth/security | Define trust and authorization boundary → implement narrow mapping → verify success/failure/replay/ownership through existing or manual checks → inspect logs for leakage |
| Performance | State workload/metric → measure baseline → change → measure same workload → run correctness checks |
| Cross-repository integration | Compare contracts → change each repository within scope → verify each with its own workflow → run integration check or report the gap |

For multi-stage work, keep a task-specific plan only when decisions, progress, or
verification would otherwise be lost. Do not create implementation notes or approval
documents for routine changes.

## Verification

Running existing tests is verification, not authorization to edit them. Unless the
user explicitly requests automated tests in the current task, do not create,
modify, rename, or delete test files, snapshots, or test-only fixtures. Report
missing regression coverage as a handoff gap for a separate test phase.

| Change | Required evidence |
| --- | --- |
| Code or configuration | `npm run check` |
| Use-case or domain behavior | Run the relevant existing `npm test -- <test-file>`; add regression cases only when explicitly requested |
| HTTP/API behavior | Exercise the real app with supertest; for manual verification, run `npm run dev` and call the endpoint. Inspect responses and relevant logs |
| Prisma schema | `npm run prisma:generate`; run `npm run prisma:migrate` against a real Postgres when the change affects the database |
| Raw SQL or transaction behavior | `npm run check`; run a focused integration/manual check against real local/disposable PostgreSQL when the SQL, locking, or returned rows are material to correctness |
| Performance | Compare the same stated workload before/after and report the environment, metric, and measured result |
| Dependencies, build setup, or changes across layers | `npm run verify` |
| Documentation only | Read the final text and check referenced local paths; no build needed |

`npm run check` runs `typecheck` and `lint`. `npm run verify` additionally runs
the test suite and the production build; it stops on failure.

The project has unit tests in `tests/unit` and HTTP integration tests in
`tests/integration`. Inspect the relevant cases before claiming coverage:
passing the suite does not prove untested JWT, Google, Gemini, or database
behavior. For a mechanical extraction or rename, check the changed imports
and mapping behavior without adding tests that only restate implementation.
Record any additional manual checks separately from the committed suite.

This project has no automated architecture boundary checker (e.g.
dependency-cruiser) yet — the dependency rule in [architecture.md](architecture.md)
is enforced by review, not by `check`. Treat this as a documented gap, not a
covered guarantee.

Manual curl/browser checks and log inspection provide additional evidence; they do
not replace behavior tests. If a database or companion app is unavailable, report
the specific verification gap instead of claiming the behavior was verified.
Static checks do not prove PostgreSQL plans, constraints, isolation, locking, or
raw SQL result shape; report those gaps separately when DB verification could not
run.

## Keep feedback useful

When a mistake repeats, identify whether the missing piece is documentation, a
test, or a tool. Add a focused correction at its source of truth. Update docs
when behavior changes, and remove obsolete guidance. Keep AGENTS.md a short
entry point.

The harness currently runs locally. [.github/workflows/ci.yaml](../.github/workflows/ci.yaml)
runs `npm ci` and the same checks (`prisma:generate`, `typecheck`, `lint`,
`test`, `build`) on push and pull request. No scheduled agents, automatic
commits, or publishing are configured here.
