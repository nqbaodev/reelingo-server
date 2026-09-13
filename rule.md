# Project rules

## Language

Write everything in English: code identifiers, comments, project rules
(`AGENTS.md`, `rule.md`, `docs/`), agent skills, and `README.md`. Keep
`README.md` in sync with whichever harness doc it links to when structure
changes.

## Architecture

Use feature-first Clean Architecture. Layer responsibilities and the dependency
rule are defined in [docs/architecture.md](docs/architecture.md).

- Place code in the feature that owns the business behavior; do not move it into
  `shared` or `core` to bypass feature boundaries.
- Keep `domain` independent of Express, Prisma, Zod, and any other external
  library — plain TypeScript entities only.
- Define the repository interface (port) in `infrastructure`, next to its
  concrete adapter; `application` (use cases) depends on that interface
  directly. See [docs/architecture.md](docs/architecture.md) for why this
  project keeps the interface in `infrastructure` instead of `domain`.
- Wire concrete adapters into use cases inside `<feature>.module.ts`
  (composition root). Do not construct a repository or call Prisma directly
  from a use case, controller, or route.
- Mount feature routers and cross-cutting middleware in `app.ts`; do not add
  feature-specific routing logic there.

## TypeScript and Node

- Keep TypeScript strict; do not use `any` or type assertions to hide type
  errors.
- Read settings from `config` (`@/config`), never from `process.env` or
  `@/config/env` outside the `config` directory. Add a new setting by
  validating it in `env.ts` and exposing it through the matching group in
  `config.ts`, so a renamed variable stays contained there.
- Use `PascalCase` for classes/types, `camelCase` for functions/variables, and
  `kebab-case` for files/directories.
- Validate every external input (HTTP body/query/params) with Zod at the
  presentation boundary (`validate()` in `core/http`); do not trust `req.body`
  or `req.query` downstream of it.
- Read a validated query string from `req.validatedQuery`, never from
  `req.query`. Express 5 defines `req.query` as a getter with no setter, so
  `validate()` cannot assign the parsed value back onto it — doing so throws
  `TypeError: Cannot set property query` and turns every affected endpoint
  into a 500.
- Throw `AppError` subclasses (`core/errors`) for expected failures
  (not found, conflict, validation, unauthorized). Let unexpected errors reach
  `errorHandler` — do not catch-and-swallow them in a use case or controller.
- Shape HTTP responses through a feature's `*.presenter.ts` rather than
  returning a domain entity directly, so internal-only fields never leak
  through the API by accident.

## Testing

- Integration-test HTTP behavior by booting the real app (`createApp()`) with
  supertest; do not start a real network listener in tests.
- This project does not keep fake or in-memory repository implementations.
  A test that needs persistence runs against a real PostgreSQL database; do
  not mock the ORM to avoid one.
- Add tests for meaningful business behavior and failure cases. Do not add
  tests that merely restate the implementation.

## Security

- Never commit `.env`; keep secrets out of source, logs, and error responses.
- Validate and sanitize external input at the boundary (Zod), not deep inside
  a use case.
- Do not bypass `errorHandler` to return raw error details (stack traces,
  database errors, internal messages) to a client.

## Dependencies and verification

Follow [the development workflow](docs/development.md): define acceptance
criteria, implement within scope, verify behavior, and fix findings before
reporting completion.

- Add libraries only for the current request; install with npm and commit the
  updated lockfile together.
- Review any package pending `npm install-scripts` approval before approving
  it; approve only packages you recognize and trust.
- Pin the exact major version when adding a new dependency, especially close
  to a package's `latest` dist-tag pointing at a pre-release — verify with
  `npm view <pkg> dist-tags` when a fresh install behaves unexpectedly.
- Do not weaken architecture rules to accommodate an invalid import.

## External skills

No external skill is installed under `.agents/skills/` yet. Before adding one,
read [.agents/skills/README.md](.agents/skills/README.md) for the convention
this project follows, and add project-specific decisions to the linked project
documents rather than duplicating them inside the skill.
