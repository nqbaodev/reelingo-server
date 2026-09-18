# Project rules

## Language and coding style

Use idiomatic TypeScript with strict checking for application code. Follow
[TypeScript conventions](docs/backend.md#language-and-coding-style) for naming,
inference, public types, safe narrowing, and
[function naming](docs/backend.md#function-naming-and-responsibility). Write
identifiers, comments, documentation, and agent instructions in English.

## Scope and simplicity

Implement the current requirement with focused changes. Prefer readable functions
and existing capabilities; introduce private methods, interfaces, base classes,
or dependencies only when they clarify a responsibility or solve a concrete need.
Give each function one cohesive responsibility and a name that states its exact
outcome. Do not combine distinct commands in names or behavior such as
`createOrUpdate`, `validateAndSave`, or `fetchAndTransform`; compose focused
operations in the owning use case. Extract reusable logic only when its contract
and ownership are clear; follow the
[helper and utility rules](docs/architecture.md#shared-helpers-and-utilities).

## Architecture

Use feature-first organization with the layer responsibilities in
[architecture](docs/architecture.md). This is the project's chosen convention,
not a requirement that every feature contain every layer.

- Keep business behavior with its owning feature. Choose placement by responsibility
  and dependencies, not by suffixes such as `Service`.
- Keep layer responsibilities separate. Presentation handles HTTP, application
  coordinates use cases, domain defines business concepts and rules, infrastructure
  implements persistence/providers, and the feature module wires dependencies.
  A dependency on another layer does not transfer that layer's responsibility.
- Communicate across layers through explicit inputs, outputs, and narrow contracts.
  Do not pass Express requests, Prisma records/clients, SDK payloads, or raw provider
  errors into domain/application behavior.
- Keep repository ports beside their adapters in infrastructure and wire concrete
  dependencies only in `<feature>.module.ts`.
- Do not call Prisma or construct SDK clients in routes, controllers, or use cases.
- Keep reusable feature logic in its owning feature. Put only feature-neutral pure
  helpers in `core/utils` and feature-neutral technical infrastructure in `shared`.
  Do not move feature policy into generic code to bypass ownership.
- When changing an architectural decision, update its owning document and affected
  imports together. External examples do not silently override project decisions.
- Apply [SOLID and design patterns](docs/architecture.md#solid-and-design-patterns)
  to keep responsibilities focused and dependencies explicit. Choose patterns for
  concrete requirements; prefer composition and avoid speculative abstractions.

## TypeScript and backend

Follow [backend guidance](docs/backend.md) for HTTP, configuration, async work,
errors, localization, persistence, and security.

- Read application settings from `@/config`; keep environment access and validation
  in `app-config.ts`. Keep constants with their owner.
- Validate external input at the boundary. Use presenters to explicitly select
  response fields; keep OpenAPI aligned with the actual HTTP contract.
- Catch errors only to recover, clean up, or translate a known failure. Preserve
  causes and let unexpected failures reach the central error handler.
- Localize client-facing messages through `I18n`; keep infrastructure diagnostics
  in English and sensitive values out of logs and responses.
- Enforce identity and resource ownership on the server. Follow the auth and
  secrets invariants in [backend guidance](docs/backend.md#authentication-and-secrets).

## Verification and maintenance

Use npm and [the engineering workflow](docs/workflow.md). Test meaningful
behavior and failure cases; do not add tests merely to mirror implementation.
Report the checks actually run and any verification gaps.

Update the document that owns a decision and link to it elsewhere. Keep
`AGENTS.md` an entry point, this file a concise rule set, and detailed guidance in
`docs/`. Use [the docs index](docs/README.md) to choose what to read.

External skills are task-specific references. Check stack/version compatibility,
project rules, and applicability before adopting guidance. Keep reusable skills
in [.agents/skills](.agents/skills/README.md); do not duplicate project rules there.
For database-centered work, use the
[PostgreSQL/Prisma skill](.agents/skills/postgres-db-prisma/SKILL.md) with the
backend skill; project architecture and workflow docs remain the source of truth
for layer placement and verification.
