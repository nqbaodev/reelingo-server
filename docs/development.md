# Development workflow

This is reelingo-server's local engineering harness: discover context, implement
a scoped change, run checks, inspect behavior, and use failures to guide
corrections.

## Find context

Start with [AGENTS.md](../AGENTS.md) and [rule.md](../rule.md). Read the relevant
reference rather than loading every document:

| Task | Reference |
| --- | --- |
| Feature ownership and the dependency rule | [Architecture](architecture.md) |
| Adding a feature | [Architecture → Add a feature](architecture.md#add-a-feature) |
| Request validation, errors, HTTP response shape | [rule.md](../rule.md) (TypeScript and Node) |
| Test conventions | [rule.md](../rule.md) (Testing) |
| Secrets, input handling, error responses | [rule.md](../rule.md) (Security) |

## Work loop

1. State the requested behavior, affected scope, and observable acceptance
   criteria. Use a short message for small work.
2. Inspect existing code and reproduce a bug before changing its behavior when
   feasible. Record any existing failing checks separately from new failures.
3. Implement the smallest complete change. Follow feature ownership and the
   dependency rule; avoid speculative infrastructure.
4. Select checks below. Inspect failures, correct the cause, and rerun
   affected checks. Do not weaken checks or remove assertions merely to get a
   pass.
5. Review the final changes for unrelated edits, unused code, and stale docs.
6. Report implemented behavior, actual verification, and remaining
   limitations. Passing static checks is not evidence of untested HTTP or
   database behavior.

## Verification

| Change | Required evidence |
| --- | --- |
| Code or configuration | `npm run check` |
| Use-case or domain behavior | Relevant `npm test -- <test-file>`; add regression cases for meaningful failure modes |
| HTTP/API behavior | `npm run dev`, then exercise the endpoint (curl or supertest) and inspect the response and logs |
| Prisma schema | `npm run prisma:generate`; run `npm run prisma:migrate` against a real Postgres when the change affects the database |
| Dependencies, build setup, or changes across layers | `npm run verify` |
| Documentation only | Read the final text and check referenced local paths; no build needed |

`npm run check` runs `typecheck` and `lint`. `npm run verify` additionally runs
the test suite and the production build; it stops on failure.

The current project intentionally contains no `*.test.ts` files. Vitest is
configured with `passWithNoTests`, so a successful `verify` currently proves
static checks and compilation, not automated behavior coverage. Until tests
are reintroduced, exercise changed HTTP behavior manually and record results.

This project has no automated architecture boundary checker (e.g.
dependency-cruiser) yet — the dependency rule in [architecture.md](architecture.md)
is enforced by review, not by `check`. Treat this as a documented gap, not a
covered guarantee.

Use synthetic inputs and a local or disposable database for automated tests.
Do not depend on production credentials. Manual curl/browser checks and log
inspection provide additional evidence; they do not replace behavior tests. If
a database is unavailable, report the specific verification gap instead of
claiming the behavior was verified.

## Keep feedback useful

When a mistake repeats, identify whether the missing piece is documentation, a
test, or a tool. Add a focused correction at its source of truth. Update docs
when behavior changes, and remove obsolete guidance. Keep AGENTS.md a short
entry point.

The harness currently runs locally. [.github/workflows/ci.yaml](../.github/workflows/ci.yaml)
runs `npm ci` and the same checks (`prisma:generate`, `typecheck`, `lint`,
`test`, `build`) on push and pull request. No scheduled agents, automatic
commits, or publishing are configured here.
