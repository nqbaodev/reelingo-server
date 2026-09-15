# Backend implementation guidance

## Language and coding style

- Use TypeScript for application code with strict checking. Prefer idiomatic
  TypeScript and the project's existing style; tool configuration may use the
  format required by its runtime.
- Use `PascalCase` for classes, interfaces, types, and enums; `camelCase` for
  functions, methods, parameters, and variables. Do not prefix interfaces with
  `I` or types with `T`; short generic parameters such as `T` remain valid when
  their meaning is clear.
- Use `UPPER_SNAKE_CASE` for module-level constants representing fixed values.
  Ordinary `const` bindings, configured instances, and computed values use
  `camelCase`. Use `kebab-case` for file and directory names.
- Prefer inference for obvious local values. Declare return types on public
  service/use-case methods and explicit contracts at module boundaries where
  callers rely on them. Avoid annotations that merely repeat an initializer.
- Use interfaces for object contracts and type aliases for unions, tuples, and
  type composition; preserve existing equivalent conventions rather than
  mechanically rewriting them. Prefer `import type` for type-only dependencies.
- Use `unknown` for untrusted values and narrow or validate before use. Do not
  conceal type errors with `any`, unsafe assertions, or non-null assertions.
  `as const` and `satisfies` are appropriate for preserving/checking known types,
  but do not validate external data at runtime.
- Prefer plain functions and objects for stateless logic. Use classes when they
  provide useful state, lifecycle, or dependency encapsulation. Model distinct
  states with explicit types when that prevents invalid combinations.
- Write identifiers, comments, project documentation, and agent instructions in
  English. Keep localized product messages in their locale catalogs.

Naming and interface preferences above are project conventions, not TypeScript
language requirements. Use existing lint/format tools for formatting; do not add
new tools or rewrite unrelated code solely to apply these conventions. These
guidelines require review unless an automated check explicitly enforces them.

## Function naming and responsibility

A function has one cohesive responsibility and one reason for its behavior to
change. Judge this by the observable operation, not by statement count: a use case
may coordinate several dependencies to complete one business outcome, while a
helper must not hide unrelated validation, persistence, logging, and response work.
Do not split code into tiny functions that merely rename individual statements.

Name functions with a precise verb and subject. The name, return type, and side
effects must describe the same contract:

| Intent | Naming |
| --- | --- |
| Nullable lookup | `findUserByGoogleId`; `find*` returns the value or `null` |
| Required lookup | `getUserById` or `requireUserById`; document/encode the not-found outcome |
| Creation or mutation | `createUser`, `updateProfile`, `revokeSession` |
| Boolean query | `isNetworkError`, `hasPermission`, `canRefresh`, `shouldRetry` |
| Conversion without side effects | `toEntity`, `toUserResponse` |
| Syntax decoding/validation | `parseBearerToken`, `validateGooglePayload` |
| Business outcome | `loginWithGoogle`, `refreshSession`, `generateText` |

- Do not use combined CRUD/action names such as `createOrUpdate`, `getOrCreate`,
  `validateAndSave`, `fetchAndTransform`, or `verifyAndPersist`. Split the actions
  and let a clearly named use case coordinate them. If the database must perform
  one atomic upsert, name the repository operation `upsert<Entity>` and document
  its conflict/update semantics; do not imitate an upsert with a race-prone
  read-then-write helper.
- Avoid vague verbs such as `handle`, `process`, `manage`, `executeTask`, or
  `doWork` when a specific outcome exists. Framework-defined names such as an
  Express error handler and a generic use-case `execute` method remain valid when
  the surrounding type supplies the missing context.
- Keep queries free of mutation and commands free of hidden unrelated effects.
  A `find*` function must not create data; a `validate*` function must not persist
  it; a presenter/`to*Response` function must not query a repository.
- Keep validation at the boundary that owns it: presentation validates HTTP
  shape, infrastructure validates provider/database representations, and
  domain/application enforce business invariants. Do not repeat the same
  validation in multiple layers without a distinct trust boundary.
- Extract a function when it names a meaningful rule, isolates a side effect,
  removes real duplication, or makes a contract independently testable. Keep
  tightly related steps together when extraction would obscure the flow.
- Before treating a function as reusable, define its accepted inputs, returned
  value, side effects, failure behavior, and important edge cases. Reject or
  explicitly represent invalid input; do not silently return a convenient default,
  swallow failures, or partially mutate state unless that behavior is the contract.
- A reusable helper must implement its advertised responsibility completely for
  the supported input domain. Cover meaningful boundaries such as empty values,
  numeric/date limits, malformed external data, cancellation, and repeated calls
  when they apply. Add focused tests for non-obvious rules and failure cases.
- Avoid boolean mode parameters that make one function perform unrelated jobs,
  such as `saveUser(user, true)`. Prefer separate commands or an explicit strategy
  when the behavior and side effects differ.
- Rename a function when its responsibility changes. Do not preserve a misleading
  name for compatibility inside this private codebase; update callers and relevant
  contracts together.

## Architecture

Use feature-first Clean Architecture. Layer responsibilities and the dependency
rule are defined in [architecture.md](architecture.md).

- Place code in the feature that owns the business behavior; do not move it into
  `shared` or `core` to bypass feature boundaries.
- Keep `domain` independent of Express, Prisma, Zod, and any other external
  library — plain TypeScript entities only.
- Define the repository interface (port) in `infrastructure`, next to its
  concrete adapter; `application` (use cases) depends on that interface
  directly. See [architecture.md](architecture.md) for why this
  project keeps the interface in `infrastructure` instead of `domain`.
- Wire concrete adapters into use cases inside `<feature>.module.ts`
  (composition root). Do not construct a repository or call Prisma directly
  from a use case, controller, or route.
- Mount feature routers and cross-cutting middleware in `app.ts`; do not add
  feature-specific routing logic there.

## TypeScript and Node

- Read runtime application settings from `config` (`@/config`), never from
  `process.env` outside `app-config.ts`. Tool configuration and test setup may
  read or set the environment for their own lifecycle. Load and validate runtime settings
  there, then expose the public facade in `config.ts`. Put shared static
  settings in their owning group directly (for example,
  `config.auth.jwt.algorithm` is the source for both signing and verification).
  Do not turn every constant into an environment variable.
- Reuse pure technical helpers from `core/utils`, including time conversions
  and network-error classification. Keep their conversion constants and
  recognized error codes with the helper, not in application config. Narrow
  unknown error values with runtime checks, not casts. Helpers classify or
  transform data; the owning feature decides the business/HTTP outcome.
  See [Architecture → Shared helpers and utilities](architecture.md#shared-helpers-and-utilities).
- Put persistence/provider-to-entity mapping in the owning feature's
  `infrastructure/*.mapper.ts` with a `toEntity` export. Validate in the
  adapter before mapping; keep Prisma/SDK types out of `domain`. Import
  mappers directly to avoid collisions between `toEntity` exports. Do not
  create mappers for features that only return primitives.
- Validate every external input (HTTP body/query/params) with Zod at the
  presentation boundary (`validate()` in `core/http`); do not trust `req.body`
  or `req.query` downstream of it.
- Message keys are flat `camelCase` abbreviations of the English sentence
  (`userNotFound`, `serviceUnavailable`) with no feature prefix; reuse an
  existing key before adding one, and put variable parts in `params` with
  `{name}` placeholders. Reference keys through `I18n.<camelCase>` from
  `@/core/i18n`, never as a string literal. Only `core/i18n/translator.ts`
  may import i18next.
- In application source, language codes come from `LANGUAGE` / `SUPPORTED_LANGUAGES` /
  `DEFAULT_LANGUAGE` in `core/i18n`; HTTP header names come from
  `config.http.headers` and `config.i18n.headers`. Contract tests and documented
  HTTP examples may use literal values to verify the public interface independently.
- Read a validated query string from `req.validatedQuery`, never from
  `req.query`. Express 5 defines `req.query` as a getter with no setter, so
  `validate()` cannot assign the parsed value back onto it — doing so throws
  `TypeError: Cannot set property query` and turns every affected endpoint
  into a 500.
- Throw `AppError` subclasses (`core/errors`) for expected failures
  (not found, conflict, validation, unauthorized). Let unexpected errors reach
  `errorHandler` — do not catch-and-swallow them in a use case or controller.
- Only client-safe error messages reach the client through `AppError`, so they take an `I18n`
  key. Errors thrown inside infrastructure (`GoogleIdentityError`,
  `TokenRevocationStoreError`, plain `new Error(...)`) are log-only: keep
  their messages in plain English, as specific as possible, and never route
  them through `I18n`. Several distinct internal failures may map to one
  client message on purpose (e.g. every Google token problem →
  `invalidGoogleToken`) so the response does not reveal which check failed.
- When translating an infrastructure failure into an `AppError`, pass the
  original as `{ cause: err }`. This retains diagnostics for server-side logging;
  it does not mean every error is logged. The current handler logs 5xx and
  unexpected failures. Put client-safe data in `details`; never serialize `cause`
  to the client. Check provider error objects for secrets before logging them.
- Shape HTTP responses through a feature's `*.presenter.ts` rather than
  returning a domain entity directly, so internal-only fields never leak
  through the API by accident. Keep presenter names such as `toUserResponse`;
  `toEntity` is for infrastructure mapping, not response serialization.

## API contracts

This project generates its public OpenAPI document in `src/openapi.ts` from
project-owned Zod schemas and response definitions. The implementation and OpenAPI
form one contract and must change together; neither a stale document nor an
external example overrides the requested behavior.

- Implement only requested endpoints and fields. Update the route, request
  validator, controller/use case, presenter, status/error responses, and OpenAPI
  entry wherever the contract change affects them.
- Keep runtime validation at trust boundaries. A TypeScript type or OpenAPI schema
  alone does not validate `req.body`, query strings, provider payloads, or database
  representations.
- Treat casing, nullability, envelopes, status codes, authentication, pagination,
  and token rotation as contract behavior. Verify affected HTTP behavior through
  the real Express app with supertest; a generated schema check alone is insufficient.
- When the companion app is in scope, compare its runtime decoder and request
  adapter with the backend contract using [app integration](app-integration.md).

## Testing

- Integration-test HTTP behavior by booting the real app (`createApp()`) with
  supertest; do not start a real network listener in tests.
- This project does not keep fake or in-memory repository implementations.
  A test that needs persistence runs against a real PostgreSQL database; do
  not mock the ORM to avoid one.
- Add tests for meaningful business behavior and failure cases. Do not add
  tests that merely restate the implementation.

## Async operations and error boundaries

- Express 5 forwards rejected promises returned by async handlers to error
  middleware. Do not add a wrapper or broad controller catch merely to forward
  them; detached promises still need explicit ownership and failure handling.
- Limit a catch block to the operation whose failure it understands. A Google
  verification catch must not also convert database or JWT creation errors to 401.
- Await dependent work in order. Parallelize independent work only when ordering,
  authorization, transaction semantics, and provider limits permit it; bound fan-out.
- Configure timeouts for external calls. Retry only identified transient failures
  with bounded attempts/backoff and a safe idempotency policy. Account for retries
  already performed by the SDK; do not blindly retry writes or token rotation.
- Avoid synchronous filesystem work and CPU-heavy loops in request handlers.
  Add workers or queues only when an actual workload requires them.

## Persistence and concurrency

- Store instants in PostgreSQL as `TIMESTAMPTZ(3)` and interpret existing migrated
  timestamps as UTC only after confirming their prior semantics. Prisma models use
  `DateTime @db.Timestamptz(3)`, and HTTP presenters expose ISO 8601 UTC strings.
  Use `DATE` for date-only concepts rather than converting them to timestamps.

- Enforce uniqueness and relationships in PostgreSQL. A read followed by a create
  is not atomic; handle concurrent requests using appropriate constraints,
  atomic operations, or transactions. A conflict is not permission to link accounts.
- When several writes must succeed together, make the transaction boundary
  explicit through the repository contract. Do not leak a Prisma transaction
  client into a use case. Keep external network calls outside long transactions.
- Classify database failures in infrastructure and map known outcomes at the
  feature boundary. Do not turn every database failure into a conflict or 404.
- Bound list queries, define stable ordering, and inspect query patterns before
  adding indexes or caches.
- For a schema change, update `prisma/schema.prisma` and create the migration before
  application code relies on the new shape. Regenerate Prisma, inspect the migration
  for destructive or unintended operations, and test relevant constraints against
  a local/disposable database. Do not edit an already-applied shared migration to
  disguise a new schema change.

## Performance and operational evidence

- Start from a concrete workload, target, or observed bottleneck. Do not add caches,
  indexes, batching, queues, or concurrency solely because a generic checklist calls
  them production-ready.
- Measure comparable behavior before and after a performance change. Report the
  environment, workload, metric, and result; do not claim latency, throughput, or
  scalability targets from code inspection alone.
- Use structured logs and existing health/readiness boundaries for relevant
  operational signals. Keep credentials, request bodies, prompts, tokens, and
  unnecessary personal data out of default logs.
- Assign every security or operational requirement to the layer/component that
  enforces it. A requirement written in documentation is not evidence that the
  protection or monitoring exists.

## Authentication and secrets

- Routers mounted after `authModule.authenticate` under `/api/v1` require Bearer
  authentication. Use `req.auth` for the caller; mount public auth endpoints on
  the unguarded router. Authentication does not replace resource authorization.
- Google login is the only user creation path. Match accounts only by Google
  `sub` (`googleId`), never email. Write email and Google profile fields only at
  creation; returning logins retain the stored user unchanged.
- Login and refresh return auth tokens; fetch the user through `/me`. Preserve
  single-use refresh semantics and session revocation; see
  [authentication](../README.md#authentication).
- Keep real local secrets in gitignored `.env`; examples contain placeholders.
  Never print tokens, secrets, or raw credential-bearing bodies to confirm setup.
  Generate secrets with `crypto.randomBytes`; do not rotate `JWT_SECRET` as a
  side effect because rotation invalidates existing sessions.
- See [secret sources](../README.md#secrets). When adding environment settings,
  update `.env.example`, the README table, and required values in `tests/setup.ts`.

## Security

- Never commit `.env`; keep secrets out of source, logs, and error responses.
- Validate and sanitize external input at the boundary (Zod), not deep inside
  a use case.
- Do not bypass `errorHandler` to return raw error details (stack traces,
  database errors, internal messages) to a client.
- Enforce resource ownership per operation; CORS and frontend route guards are
  not authorization. Apply request-size limits and rate limits appropriate to
  the endpoint. Cookie-based authentication, if introduced, requires a reviewed
  CSRF policy; current Bearer behavior is not evidence of cookie protection.
- Log structured diagnostic metadata, with credentials and unnecessary personal
  data redacted. Capture errors at an owning boundary to avoid duplicate reports;
  do not install Sentry or another telemetry vendor just to satisfy a generic rule.

These are requirements for relevant changes, not evidence of a completed security
audit or proof that every existing path implements them.

## Dependencies and verification

Follow [the engineering workflow](workflow.md): define acceptance
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

## Reference material

Use these references selectively and check compatibility with installed versions.
Project conventions remain explicit decisions; examples do not require adopting
their folder layout, dependencies, inheritance, or telemetry vendor.

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices):
  component ownership, errors, async work, and operational practices.
- [Express error handling](https://expressjs.com/en/guide/error-handling/):
  Express 5 async handlers and the central error boundary.
- [Express production security](https://expressjs.com/en/advanced/best-practice-security/):
  HTTP security and deployment considerations.
- [OWASP Node.js security](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html):
  trust boundaries and server-side protections.
- [JavaScript testing practices](https://github.com/goldbergyoni/javascript-testing-best-practices):
  behavior-focused testing and isolation.

## External skills

No external skill is installed under `.agents/skills/` yet. Before adding one,
read [.agents/skills/README.md](../.agents/skills/README.md) for the convention
this project follows, and add project-specific decisions to the linked project
documents rather than duplicating them inside the skill.
