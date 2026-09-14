# Architecture guidelines

Organize code by feature first, then by layer within each feature. The app
currently composes `health`, `auth`, `users`, and `ai` features on top of
shared Express/Prisma infrastructure.

## Responsibilities and dependencies

| Location | Responsibility |
| --- | --- |
| `features/<feature>/domain` | Plain entity types; no Express, Prisma, Zod, or other external library |
| `features/<feature>/application` | Use cases; depend on the repository interface defined in `infrastructure` |
| `features/<feature>/infrastructure` | Repository interface (port) and its concrete adapter (Prisma) |
| `features/<feature>/presentation` | Express router, controller, Zod validators, response presenter |
| `features/<feature>/<feature>.module.ts` | Composition root: wires the adapter into use cases and exposes a router |
| `config` | `env.ts` validates raw environment variables; `config.ts` groups them by domain and is what the rest of the app imports |
| `core` | Cross-cutting abstractions independent of any feature (`AppError`, `asyncHandler`, `validate`, pagination, `i18n`) |
| `core/utils` | Pure technical helpers and their constants; no feature, config, database, or HTTP-response dependencies |
| `core/i18n` | `translate(key, language, params)` is the port; `translator.ts` is the only file that imports i18next, so the library can be swapped without touching features |
| `shared` | Shared technical infrastructure (Prisma client, logger, error/rate-limit middleware) |
| `app.ts` | Mounts feature routers and cross-cutting middleware |
| `server.ts` | Starts the HTTP server and handles graceful shutdown |

## HTTP conventions

- `core/i18n` owns the pure language resolver, typed message catalogs, and
  parameter interpolation. It does not import Express or access request state.
- `shared/middlewares/language.ts` selects a language per request. `AppError`
  carries a typed message key and parameters; the global error handler translates
  it and returns `{ success: false, message, error: { code } }`, with optional
  client-safe `error.details`. Internal messages, stacks, and causes are never
  exposed.
- Feature controllers pass presenter output to `core/http/sendSuccess`, which
  returns `{ success: true, message, data }`. Responses are built explicitly;
  Express's `res.json` is not replaced or intercepted. A 204 stays empty.
- `openapi.ts` composes the public API contract from feature validators;
  `shared/http/docs.routes.ts` only serves the document and Swagger UI.
- The `health` feature owns probe routes and the readiness interface/Prisma
  adapter. `health.module.ts` wires the real database; probes do not require
  a domain entity, repository table, or HTTP response envelope.
- `app.ts` mounts the API rate limiter once and composes protected feature
  routers behind one authentication middleware. Public probes/docs are separate.

## Entity mapping

Keep persistence/provider-to-entity conversions in the owning feature's
`infrastructure/<source>.mapper.ts`, exposed as `toEntity`. Import each mapper
directly rather than re-exporting identical names from a barrel. Adapters
validate external data before mapping it; mappers only convert its shape.
Keep provider/Prisma types out of `domain`, and keep entity-to-HTTP conversions
in presentation's `*.presenter.ts`. Features returning only primitive values
do not need an entity mapper.

## Shared utilities

Use `core/utils` for reusable technical logic that does not belong to a
feature. Group related functions and constants by purpose: `time.ts` owns
`toSeconds`, `SECOND_MS`, and `MINUTE_MS`; `network-error.ts` owns
`isNetworkError` and its recognized codes. Export helpers through the local
barrel without importing application config or feature code back into them.

Network classification is not a global error-response policy. Each adapter
decides how a recognized failure affects its operation; the feature maps
infrastructure errors to localized `AppError` responses at the appropriate
boundary. Keep infrastructure diagnostics in English and retain causes when
wrapping failures, as described in [rule.md](../rule.md).

Keep feature-specific behavior in its feature even when it has more than one
caller. Extract only helpers needed by the current task; do not add generic
base services, prototype extensions, or empty utility layers.

## Dependency rule

```
presentation  ->  application  ->  infrastructure  ->  domain
```

`domain` contains only plain entities — it never imports Express, Prisma, or
Zod. The repository **interface** (the port a use case codes against) lives in
`infrastructure`, next to its Prisma implementation, rather than in `domain`.

This is a deliberate deviation from the textbook Clean Architecture placement
(interface in the inner layer, implementation in the outer layer). The
trade-off: `application` is no longer independent of persistence details —
swapping Prisma for another store touches the interface every use case depends
on. In exchange, the feature has one fewer folder/indirection. Follow this
placement for new features unless a future decision revisits it — do not put
some repository interfaces in `domain` and others in `infrastructure`.

No automated boundary checker enforces this yet (see
[development.md](development.md) verification table) — treat it as a review
responsibility until one is added.

## Extension principles

Implement domain/application/infrastructure/presentation only for a concrete
business requirement — do not add sample logic to fill out a layer. Express
serves the HTTP API; Prisma is the only persistence adapter currently wired
up. Google Identity and Gemini are the wired external services, and the `auth`
feature owns authentication. No queue or background worker has been added.

For a service integration (email, storage, a third-party API), define the
interface in `application`, or in `infrastructure` next to its adapter
following the pattern above, and wire the concrete adapter in the feature's
`*.module.ts`. Do not construct a client or call an SDK directly from a
controller or use case.

## Add a feature

1. `src/features/<name>/domain/` — define the entity.
2. `src/features/<name>/infrastructure/` — define the repository interface and
   implement it with Prisma.
3. `src/features/<name>/application/` — write use cases; depend on the
   repository interface.
4. `src/features/<name>/presentation/` — Zod validators, a presenter mapping
   the entity to an HTTP response shape, a controller, and an Express router.
5. `src/features/<name>/<name>.module.ts` — wire the pieces and export
   `router`.
6. Mount the router in [../src/app.ts](../src/app.ts).
7. Add a Prisma model to [../prisma/schema.prisma](../prisma/schema.prisma) and
   run `npm run prisma:generate` (and `prisma:migrate` against a real
   database) when the feature needs new persisted data.

## References

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Prisma ORM v7 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) — driver adapters and `prisma.config.ts` are required as of v7; see `src/shared/database/prisma-client.ts` for this project's setup.
