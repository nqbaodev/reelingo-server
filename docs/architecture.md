# Architecture guidelines

Organize code by feature first, then by layer within each feature. The app
currently composes `health`, `auth`, `users`, and `ai` features on top of
shared Express/Prisma infrastructure.

## Responsibilities and dependencies

Feature-first defines ownership first; layers then separate responsibilities inside
that feature. Files belong to the feature whose business behavior they support, and
to the layer whose work they perform. Sharing data or calling a dependency does not
permit one layer to take over another layer's work.

| Layer | Owns | Must not do |
| --- | --- | --- |
| `features/<feature>/domain` | Entities, value types, and business rules that can run without frameworks | Import Express, Prisma, Zod, configuration, provider SDKs, repositories, or HTTP concerns |
| `features/<feature>/application` | Use-case orchestration, business decisions spanning entities/ports, and application outcomes | Parse HTTP, format responses, call Prisma/SDKs directly, construct adapters, or decide logging/transport policy |
| `features/<feature>/infrastructure` | Repository ports/adapters, Prisma/provider mapping, external clients, and feature-owned technical services | Read Express request state, format HTTP responses, localize client messages, or decide business outcomes that belong to a use case |
| `features/<feature>/presentation` | Routes, authentication/validation middleware, controllers, Zod request schemas, presenters, and HTTP error mapping | Query Prisma, call provider SDKs directly, construct infrastructure, or contain business/persistence rules |
| `features/<feature>/<feature>.module.ts` | Composition root that constructs concrete dependencies and exposes routers/middleware | Implement request handling, business rules, database queries, or provider behavior |

Layer boundaries apply to behavior as well as imports:

- Presentation converts validated HTTP input to use-case input and converts the
  result to an explicit response. It may translate known boundary failures into
  HTTP errors, but it must not reinterpret unrelated failures.
- Application depends on domain types and narrow capability contracts. Under this
  project's convention, repository/provider ports live beside adapters in
  `infrastructure`; those ports must remain free of Prisma and SDK types.
- Infrastructure validates external representations when necessary, maps them to
  project-owned types, and reports typed technical failures. It does not choose a
  localized response or silently apply account/business policy.
- Domain accepts and returns project-owned values. It must be testable without an
  HTTP server, database, environment variables, or provider credentials.
- The composition root is the only feature location that selects and constructs
  concrete adapters. Tests may construct dependencies in their own setup.
- Cross-feature calls use the owning feature's public contract. Do not import a
  concrete adapter from another feature to bypass its application behavior.

When one operation appears to need work from several layers, split the flow at the
boundary instead of moving all work into one class. For example: presentation
validates an ID token string, application requests identity verification and
resolves the account, infrastructure verifies the token with Google and persists
the user, and presentation shapes the auth-token response.

## Project-wide locations

| Location | Responsibility |
| --- | --- |
| `config` | `app-config.ts` owns validated environment-backed settings; `config.ts` exposes the public facade imported by the app |
| `core` | Cross-cutting abstractions independent of any feature (`AppError`, `validate`, pagination, `i18n`) |
| `core/utils` | Pure technical helpers and their constants; no feature, config, database, or HTTP-response dependencies |
| `core/i18n` | `translate(key, language, params)` is the port; `translator.ts` is the only file that imports i18next, so the library can be swapped without touching features |
| `shared` | Shared technical infrastructure (Prisma client, logger, error/rate-limit middleware) |
| `app.ts` | Mounts feature routers and cross-cutting middleware |
| `server.ts` | Starts the HTTP server and handles graceful shutdown |

## Services and shared ownership

`Service` describes a role, not a mandatory folder. Application services implement
use cases; technical services implement mechanisms such as signing tokens or
calling an SDK. Place them according to ownership and dependencies.

- Keep session policy and auth-specific claims in auth. The current `JwtService`
  belongs in `auth/infrastructure` because it combines JWT signing with auth
  token/session behavior.
- `shared/services` is an acceptable location for a genuinely feature-neutral
  technical service with current consumers across features. It must not import
  feature-owned entities or decide a feature's business policy.
- Pure reusable transformations belong in `core/utils`. A second caller inside
  the same feature alone is not a reason to move its code out.
- Do not create a shared wrapper or interface just for a naming convention. Add
  an interface when it expresses a useful dependency contract, supports an actual
  adapter boundary, or enables relevant tests.

This layout is a project decision. A future move to top-level services or another
layering scheme should update this document and the affected code consistently.

## SOLID and design patterns

Apply these principles to new and changed code in proportion to its responsibility.
They guide design decisions; they do not require a class, interface, or extra layer
for every operation. Existing code is not automatically certified as conforming.

| Principle | Application in this project |
| --- | --- |
| Single Responsibility | Keep HTTP handling, business decisions, persistence, and provider integration separate. Each function and module has one cohesive reason to change. Name the exact outcome and avoid combined actions such as `createOrUpdate`; see [function naming](backend.md#function-naming-and-responsibility). |
| Open/Closed | When a real requirement introduces interchangeable behavior, extend through a stable contract or composed function. Do not build a plugin framework for hypothetical variants. |
| Liskov Substitution | Implementations of a contract preserve its accepted inputs, outputs, error semantics, and side-effect guarantees. Do not offer an implementation that throws “not supported” for required operations. Test meaningful contract behavior when alternatives exist. |
| Interface Segregation | Expose the operations consumers actually need. Avoid large generic service/repository interfaces and dependencies on unrelated capabilities. |
| Dependency Inversion | Business orchestration should depend on small capability contracts at external boundaries. Keep SDK/Prisma types in adapters and inject implementations through the composition root. A function type can be a contract; an abstract class is not required. |

Repository ports retain their location in `infrastructure` under this project's
convention. For new or materially changed external integrations, prefer a small,
consumer-relevant contract over coupling a use case to an SDK or concrete class's
private state. Existing concrete technical-service dependencies can be improved
when the task touches their boundary; do not perform unrelated mass refactors.

Select patterns by the problem they solve:

| Pattern | Use when |
| --- | --- |
| Repository | A use case needs persistence operations expressed without Prisma details; keep the existing ports and adapters. |
| Adapter | A provider SDK or external payload must conform to the feature's contract. |
| Strategy | A current requirement has interchangeable algorithms or policies; a typed function is sufficient for simple strategies. |
| Factory / composition root | Construction must consistently wire dependencies or choose an actual implementation; use the feature module before adding a factory abstraction. |
| Decorator | An existing contract needs a composable concern such as metrics or bounded retry; preserve its semantics and avoid duplicate SDK behavior. |

Prefer composition over inheritance. Add inheritance only for a genuine
substitutability relationship, not just code reuse. Do not introduce mandatory
BaseController/BaseService classes, service locators, global mutable registries,
or one-interface-per-class scaffolding. Explain a non-obvious pattern by its
concrete benefit and verify the affected behavior, not the pattern's class names.

## HTTP conventions

- Feature routers use `createBaseRouter` from `core/http` with an ordered list
  of `method`, `path`, optional `middlewares`, and `handler` definitions.
  Methods use the shared `HttpMethod` enum from `core/http`.
  Middleware runs in the listed order before the handler; Express 5 forwards
  rejected handler promises to the error middleware. Keep static paths before
  parameter paths when they overlap. Manage endpoints in the owning feature's
  `*.routes.ts`; mounting and authentication boundaries remain in `app.ts`.
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
- `app.ts` mounts the API rate limiter once, then the auth feature's public
  router, the authentication middleware, and the protected auth/users/AI
  routers in that order. Public probes/docs are separate.
- `shared/http/endpoints.ts` owns the API prefix and paths grouped by feature,
  including public health and documentation paths. Routers and `openapi.ts`
  share these values. API feature paths remain relative to `apiPrefix`;
  OpenAPI converts Express's `:id` parameter to `{id}`.

## Entity mapping

Keep persistence/provider-to-entity conversions in the owning feature's
`infrastructure/<source>.mapper.ts`, exposed as `toEntity`. Import each mapper
directly rather than re-exporting identical names from a barrel. Adapters
validate external data before mapping it; mappers only convert its shape.
Keep provider/Prisma types out of `domain`, and keep entity-to-HTTP conversions
in presentation's `*.presenter.ts`. Features returning only primitive values
do not need an entity mapper.

## Shared helpers and utilities

Reuse does not automatically mean global sharing. Place a helper at the narrowest
scope that owns its meaning:

| Kind | Location |
| --- | --- |
| One caller and no separately meaningful rule | Keep the logic in the caller |
| Reusable business/domain rule for one feature | The owning feature's `domain` or `application` layer |
| Reusable mapper/parser for one feature boundary | The owning feature's `infrastructure` or `presentation` layer |
| Pure feature-neutral technical transformation | `core/utils/<purpose>.ts` |
| Feature-neutral stateful or I/O capability | An appropriate `shared` module/service, not `core/utils` |

Create a helper only when it has a clear contract and cohesive responsibility,
removes real duplication, names a non-obvious rule, or needs independent tests.
Do not extract speculative helpers for possible future reuse, and do not move
business policy into `helper`, `utils`, `common`, or `shared` to make an import
convenient.

Name modules by purpose rather than creating catch-all `helper.ts`, `utils.ts`, or
`common.ts` files. For example, `time.ts` owns `toSeconds`, `SECOND_MS`, and
`MINUTE_MS`; `network-error.ts` owns `isNetworkError` and its recognized codes.
Export public helpers through the local barrel without importing application
configuration or feature code back into `core/utils`.

Pure helpers should be deterministic and free of hidden I/O, logging, environment
reads, clocks, randomness, or mutation. Pass required values explicitly. If the
operation needs state or I/O, model it as an owned service/adapter with explicit
failure behavior rather than disguising it as a utility.

A shared function owns the full supported behavior named by its contract. Define
input assumptions, outputs, errors, side effects, and relevant boundary cases before
reuse. Do not swallow errors, return misleading fallbacks, or accept unrelated mode
flags merely to make one helper serve multiple responsibilities. Test meaningful
edge cases when the behavior is non-trivial.

`bearer-token.ts` and `requireAuth` stay in the auth presentation layer:
their current callers belong to auth. The parser reads a single credential
without throwing HTTP errors; the middleware decides how to reject invalid
input. `requireAuth` reads the feature's request context.
Prisma error classifiers belong in
`shared/database/prisma-error.ts`, where `isPrismaUniqueViolation` identifies
unique constraint failures without deciding the feature's response.

Network classification is not a global error-response policy. Each adapter
decides how a recognized failure affects its operation; the feature maps
infrastructure errors to localized `AppError` responses at the appropriate
boundary. Keep infrastructure diagnostics in English and retain causes when
wrapping failures, as described in [backend guidance](backend.md).

Keep feature-specific behavior in its feature even when it has more than one
caller. Extract only helpers needed by the current task; do not add generic
base services, prototype extensions, or empty utility layers.

## Dependency rule

```text
presentation  ->  application  ->  infrastructure ports
       |                |                    |
       +----------------+--------------------+--> domain

infrastructure adapters --------------------------> domain
feature module -----------------------------------> all feature layers
```

Arrows show allowed compile-time knowledge, not ownership of behavior. Presentation
may know a technical error type solely to map it at the HTTP boundary; it may not
perform that adapter's operation. Application may call a repository port; it may
not write the query. Infrastructure may create a domain entity; it may not decide
the use case merely because it has the data.

`domain` contains only plain entities — it never imports Express, Prisma, or
Zod. The repository **interface** (the port a use case codes against) lives in
`infrastructure`, next to its Prisma implementation, rather than in `domain`.

This is a deliberate deviation from the textbook Clean Architecture placement
(interface in the inner layer, implementation in the outer layer). The
trade-off is organizational: application imports a contract from a directory also
containing infrastructure implementations. Keep that contract free of Prisma
types; replacing Prisma need not change the contract or its consumers. Some current
technical dependencies use concrete class types; that coupling is separate from
where repository interfaces live. Follow this
placement for new features unless a future decision revisits it — do not put
some repository interfaces in `domain` and others in `infrastructure`.

No automated boundary checker enforces this yet (see
[workflow.md](workflow.md) verification table) — treat it as a review
responsibility until one is added.

## Extension principles

Implement domain/application/infrastructure/presentation only for a concrete
business requirement — do not add sample logic to fill out a layer. Express
serves the HTTP API; Prisma is the only persistence adapter currently wired
up. Google Identity and Gemini are the wired external services, and the `auth`
feature owns authentication. No queue or background worker has been added.

For a service integration (email, storage, a third-party API), put the adapter
and any required port in the feature's `infrastructure`, following the repository
convention above, and wire the concrete adapter in the feature's
`*.module.ts`. Do not construct a client or call an SDK directly from a
controller or use case.

## Add a feature

1. `src/features/<name>/domain/` — define the entity.
2. `src/features/<name>/infrastructure/` — define the repository interface and
   implement it with Prisma.
3. `src/features/<name>/application/` — write use cases; depend on the
   repository interface.
4. `src/features/<name>/presentation/` — Zod validators, a presenter mapping
   the entity to an HTTP response shape, a controller, and an Express router
   defined with `createBaseRouter` from `core/http`.
5. `src/features/<name>/<name>.module.ts` — wire the pieces and export
   `router`.
6. Mount the router in [../src/app.ts](../src/app.ts).
7. Add a Prisma model to [../prisma/schema.prisma](../prisma/schema.prisma) and
   run `npm run prisma:generate` (and `prisma:migrate` against a real
   database) when the feature needs new persisted data.

## References

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Prisma ORM v7 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) — driver adapters and `prisma.config.ts` are required as of v7; see `src/shared/database/prisma-client.ts` for this project's setup.
