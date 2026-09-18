# AGENTS.md

## Project

**reelingo-server** — Reelingo's Node.js, Express 5, and TypeScript backend,
with Prisma and PostgreSQL.

Read [rule.md](rule.md) before changing code. Use
[the engineering workflow](docs/workflow.md) to choose verification and
[the docs index](docs/README.md) to find the document that owns a decision.

Read task-specific guidance as needed:

- [Architecture](docs/architecture.md): feature ownership, services, shared code,
  dependency direction, and mapping.
- [Backend](docs/backend.md): HTTP, async errors, localization, configuration,
  persistence, authentication, and secrets.
- [App integration](docs/app-integration.md): companion frontend references and
  API contract checks.
- [Chat feature](docs/chat.md): conversation, message, media, ownership, and
  pagination decisions plus deferred chat behavior.
- [Backend development skill](.agents/skills/backend-dev-guidelines/SKILL.md):
  task routing and review gates for backend implementation/refactoring.
- [PostgreSQL/Prisma skill](.agents/skills/postgres-db-prisma/SKILL.md):
  database query, migration, transaction, index, pooling, raw SQL, and
  PostgreSQL performance guidance.
- [Agent skills](.agents/skills/README.md): skill ownership and conventions.

## Local constraints

- PostgreSQL runs as a native Homebrew service on port 5432. Do not start the
  Compose database on the same port. The `reelingo` role needs `CREATEDB` for
  Prisma's shadow database; see [local setup](README.md#database-local).
- Google login is the only user creation path. Match by Google `sub`, never by
  email. See [auth invariants](docs/backend.md#authentication-and-secrets).
- Keep secrets out of outputs and version control. Do not rotate `JWT_SECRET`
  as a side effect; see [secret sources](README.md#secrets).

## Working guidelines

State assumptions that affect behavior, make focused changes, and verify the
requested outcome. Prefer existing capabilities and avoid speculative abstractions.
Update the owning document when a decision changes; link instead of duplicating it.

## Commands

Use npm. See the workflow for behavior tests and manual HTTP verification.

```sh
npm run check                 # TypeScript + lint
npm run verify                # Check + tests + production build
```

Documentation-only changes require reading the final text and checking links;
they do not require an application build.
