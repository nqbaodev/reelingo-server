# Architecture guidelines

The project uses a **layer-first Clean Architecture**. Inside each layer, files are
grouped first by responsibility and then by business area. For example,
`application/use-cases/messages`, `infrastructure/repositories/messages`, and
`presentation/controllers/messages` describe the same area from different layers.

This is intentionally not feature-first. It also does not add generic `main`,
`shared`, or `ports` folders. Application assembly lives in `container.ts`, the
Express app lives in `app.ts`, and process startup lives in `server.ts`.

## Directory layout

```text
src/
  domain/
    entities/
      <area>/
    value-objects/         # only when needed
    rules/                 # only when needed
  application/
    use-cases/<area>/
    events/<area>/         # only when needed
    policies/<area>/       # only when needed
    interfaces/
      repositories/
      ai/
      auth/
      health/
      identity/
      logging/
      security/
      storage/
    errors/
    i18n/
    pagination/
  infrastructure/
    repositories/<area>/
    mappers/<area>/
    clients/<area-or-provider>/
    stores/<area>/
    storage/<area>/
    workers/<area>/
    readiness/<area>/
    database/prisma/
    logging/
    security/
    services/
  presentation/
    routes/<area>/
    controllers/<area>/
    dtos/<area>/
    presenters/<area>/
    middlewares/<area>/
    validations/<area>/    # only when a separate schema module is useful
    http/
    openapi/
    middlewares/
  config/
  utils/
  container.ts
  app.ts
  server.ts
```

Only create a subfolder when it contains real code. These subfolders organize a
layer; they are not extra architectural layers.

## Responsibilities

| Layer            | Owns                                                                                           | Must not do                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `domain`         | Entities, value objects, and pure business rules                                               | Import Express, Prisma, Zod, configuration, provider SDKs, or HTTP types               |
| `application`    | Use cases, orchestration, application errors, and contracts required by use cases              | Parse HTTP, query Prisma, call SDKs directly, or construct concrete adapters           |
| `infrastructure` | Prisma repositories, provider clients, storage, security implementations, logging, and workers | Handle Express requests, format HTTP responses, or decide transport policy             |
| `presentation`   | Routes, controllers, request/response DTOs, validation, presenters, and HTTP middleware        | Query Prisma, call provider SDKs, construct repositories, or contain persistence rules |
| `container.ts`   | Select and construct concrete implementations, use cases, controllers, and routers             | Contain request handling or business logic                                             |
| `app.ts`         | Configure Express and mount middleware/routes supplied by the container                        | Start listening or implement use cases                                                 |
| `server.ts`      | Start the process, listen on the configured port, run workers, and shut down cleanly           | Configure feature routes or contain business logic                                     |

## Dependency rule

```text
presentation ------> application ------> domain
      |                    ^
      |                    |
      +------------ application interfaces
                           ^
                           |
infrastructure ------------+
      |
      +------------------------------> domain

container.ts ----> presentation + application + infrastructure
app.ts ----------> container.ts + presentation middleware
server.ts -------> app.ts + infrastructure lifecycle services
```

Dependencies point inward:

- `domain` imports no outer layer.
- `application` may import `domain` and contracts in
  `application/interfaces`; it never imports an infrastructure implementation.
- `infrastructure` implements application contracts and may map external data to
  domain entities.
- `presentation` calls application use cases and uses application-owned result or
  error types. It does not perform infrastructure work.
- `container.ts` is the only production composition root. Tests may assemble
  dependencies in their own setup.

An interface belongs to `application/interfaces` when application code needs the
capability. The name `ports` is unnecessary: repository, identity, token, AI,
storage, readiness, and logging contracts are grouped by their concrete purpose.
Prisma and SDK types must not leak into these contracts.

## Business-area ownership

Layer-first does not remove ownership. A responsibility folder contains business
area subfolders where needed:

- `application/use-cases/messages`, `infrastructure/repositories/messages`, and
  `presentation/controllers/messages` are three views of the messages area.
- Domain concepts are grouped first by responsibility and then by business area,
  for example `domain/entities/users` and `domain/entities/messages`. This keeps
  entities together without returning to feature-first organization at `src/`.
- Cross-area orchestration belongs in the application use case responsible for the
  outcome; it calls narrow contracts instead of another area's concrete adapter.
- Cross-cutting transport code belongs in `presentation/http` or
  `presentation/middlewares`.
- Cross-cutting I/O implementations belong in the relevant `infrastructure`
  category, such as `database/prisma`, `logging`, or `security`.
- Pure, area-neutral transformations belong in `utils`.

Do not move business policy into a generic folder merely because it has more than
one caller.

## DTOs, validation, entities, and presenters

DTOs are present under `presentation/dtos/<area>`. They describe the HTTP
boundary, not the database or domain model:

- request DTO/schema: parses and validates untrusted params, query, headers, or
  body before the controller calls a use case;
- response DTO: defines the public response shape and prevents accidental exposure
  of persistence/provider fields;
- presenter: maps an application/domain result into the response DTO;
- entity: represents a business concept and remains independent of HTTP and Zod.

A small area may keep its Zod schema and inferred request type in one DTO file.
Split reusable or large schemas into a `validations/` subfolder only when doing so
improves navigation; do not create an empty folder for symmetry. OpenAPI reuses the
same request/response schemas where practical so implementation and documentation
do not drift.

## Repository and integration boundaries

Repository interfaces live in `application/interfaces/repositories`. Concrete
Prisma implementations live in `infrastructure/repositories/<area>`, while
persistence-to-entity conversions live in `infrastructure/mappers/<area>`. Use
cases depend only on the interface.

The same rule applies to external services:

- Google identity verification implements an identity contract from
  `application/interfaces/identity`.
- JWT signing and verification implement a token contract from
  `application/interfaces/security`.
- AI capability contracts live in `application/interfaces/ai`; provider registry,
  routing services, and SDK clients are infrastructure implementations.
- Asset storage implements the contract in `application/interfaces/storage`.

Adapters validate external representations, preserve useful failure causes, and
return project-owned values. They do not localize client messages or choose HTTP
status codes.

## HTTP conventions

- Area routers use `createBaseRouter` from `presentation/http` and keep route
  definitions thin.
- Controllers accept already-validated input, call one application use case, and
  return an explicit presenter result through `sendSuccess`.
- Express 5 forwards rejected async handlers to the centralized error middleware.
- `application/i18n` owns typed message keys and translation; request language
  selection and HTTP error serialization remain in presentation.
- `presentation/http/endpoints.ts` is the route-path source of truth.
- `presentation/http/openapi.ts` composes the public API document; admin logging
  owns its separate document under `presentation/admin-logs`.
- `app.ts` mounts public probes/docs, rate limits, public auth routes,
  authentication, protected routers, and final error middleware in that order.

## Shared helpers and utilities

Reuse does not automatically require global sharing. Place code at the narrowest
scope that owns its meaning:

| Kind                                | Location                                                              |
| ----------------------------------- | --------------------------------------------------------------------- |
| One caller, no independent rule     | Keep it in the caller                                                 |
| Reusable business rule for one area | The matching domain category or `application/<responsibility>/<area>` |
| Boundary mapper/parser for one area | `infrastructure/mappers/<area>` or the matching presentation category |
| Pure area-neutral transformation    | `utils/<purpose>.ts`                                                  |
| Stateful or I/O capability          | A named application contract plus infrastructure implementation       |

Avoid catch-all `helper.ts`, `common.ts`, or `shared` folders. A pure utility is
deterministic and has no hidden I/O, environment access, logging, clock, randomness,
or mutation. Pass required values explicitly.

## SOLID and design patterns

Apply patterns only when they solve a current boundary or variation:

| Principle/pattern     | Project use                                                                          |
| --------------------- | ------------------------------------------------------------------------------------ |
| Single Responsibility | Separate HTTP, orchestration, business rules, and persistence/provider work          |
| Dependency Inversion  | Use cases depend on small contracts in `application/interfaces`                      |
| Repository            | Express persistence needs without Prisma details                                     |
| Adapter               | Convert an SDK, provider, or storage implementation to an application contract       |
| Strategy              | Represent a real interchangeable policy; a typed function is enough for simple cases |
| Composition root      | Build concrete dependencies once in `container.ts`                                   |

Prefer composition over inheritance. Do not introduce mandatory base controllers,
base services, service locators, global mutable registries, or one interface for
every class.

## Add a business area

1. Add an entity under `src/domain/entities/<area>` or a rule/value object in its
   matching domain category only if the behavior needs one.
2. Define required repository/provider contracts under
   `src/application/interfaces/<capability>`.
3. Implement the use case under `src/application/use-cases/<area>`.
4. Implement Prisma/provider adapters under the matching infrastructure
   responsibility, such as `src/infrastructure/repositories/<area>` and
   `src/infrastructure/mappers/<area>`.
5. Add DTOs, validation, presenter, controller, and route under their presentation
   responsibilities, each grouped by `<area>`.
6. Wire concrete dependencies and expose the router in `src/container.ts`.
7. Mount it in `src/app.ts` only when it has a new top-level mount point.
8. When persistence changes, update the Prisma schema and migration together and
   follow the database verification workflow.

No automated boundary checker enforces these imports yet. Review dependency
direction and run the checks in [workflow.md](workflow.md) for every structural
change.

## References

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Prisma ORM v7 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) — see `src/infrastructure/database/prisma/prisma-client.ts` for this project's driver-adapter setup.
