---
name: backend-dev-guidelines
description: Implement, refactor, or review Node.js, Express, TypeScript, and Prisma backend code in reelingo-server. Use for feature/layer placement, function design, shared helpers, HTTP behavior, persistence, authentication, and backend verification. Do not use for companion frontend implementation.
---

# Backend development guidelines

Apply the repository's own decisions before generic backend advice. Start with
[project rules](../../../rule.md), then read only the task-specific references
below. External examples never override the user's requested behavior or the
repository's documented contract.

## Route the task

- Read [architecture](../../../docs/architecture.md) when adding/moving code,
  changing dependencies, reviewing SOLID, selecting a pattern, or deciding between
  a feature, layer, `core`, and `shared`.
- Read [backend guidance](../../../docs/backend.md) for TypeScript/function naming,
  input validation, errors, async work, persistence, auth, secrets, and security.
- Read [engineering workflow](../../../docs/workflow.md) before selecting tests
  or reporting completion.
- Read [app integration](../../../docs/app-integration.md) only when the backend API
  contract or companion app is in scope.

## Make the change

1. State the observable behavior and identify the feature that owns it. Treat the
   user's request and current project contracts as scope; do not invent endpoints,
   fields, security behavior, or performance guarantees.
2. Assign each responsibility to its layer before editing. Presentation owns HTTP;
   application owns use-case orchestration; domain owns business concepts/rules;
   infrastructure owns Prisma/providers; the feature module owns construction.
3. Define narrow inputs, outputs, errors, and side effects at boundaries. Keep
   framework and provider representations out of domain/application behavior.
4. Give every function one cohesive responsibility and a precise outcome name.
   Do not introduce combined actions such as `createOrUpdate`, `validateAndSave`,
   or `fetchAndTransform`; compose focused operations in the use case.
5. Keep reusable logic at the narrowest owning scope. Move only pure,
   feature-neutral transformations to `core/utils`; put feature-neutral stateful
   or I/O capabilities in `shared`. Never create a helper for hypothetical reuse.
6. Apply SOLID or a design pattern only when it solves a concrete boundary,
   variation, or testability problem. Prefer composition and existing feature
   modules over base classes, service locators, and one-interface-per-class code.
7. Implement the smallest complete change. For an API contract change, update the
   route, boundary validation, presenter, errors, and OpenAPI together. For a schema
   change, update the Prisma schema and migration together before relying on the
   generated client.
8. Run the checks required by the workflow, inspect failures, and report actual
   evidence plus any remaining gap.

## Review gates

Before finishing, verify that:

- no layer performs another layer's work or constructs its concrete dependency;
- queries do not mutate and validation/presentation helpers do not persist data;
- reusable functions define supported inputs, edge cases, failures, and side effects;
- implemented endpoints, validation, response fields, errors, and OpenAPI agree;
- expected failures are mapped narrowly and unexpected causes remain observable;
- database writes account for constraints, concurrency, and transaction boundaries;
- schema changes include Prisma generation, migration, and relevant real-database
  verification, or explicitly report why an environment-dependent check was not run;
- auth changes preserve Google `sub` identity, resource authorization, refresh
  rotation, session revocation, and secret-handling invariants;
- security responsibilities name the enforcing boundary, and performance claims
  include a stated workload plus measurements rather than estimates;
- tests cover meaningful behavior rather than class names or implementation shape;
- comments and docs describe the final behavior and remain in English.

Do not claim that applying this skill proves existing code is compliant or that a
static check verifies runtime, database, security, or frontend integration behavior.
