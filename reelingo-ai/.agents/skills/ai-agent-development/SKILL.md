---
name: ai-agent-development
description: Implement, refactor, or review the Reelingo TypeScript AI service, including agents, workflows, provider adapters, tools, memory, RAG, media, streaming contracts, and server integration. Do not use for reelingo-server business logic or database implementation.
---

# AI agent development

Apply this project's decisions before generic agent-framework advice. Start with
[project rules](../../../rule.md), then read only the task-specific references.

## Route the task

- Read [architecture](../../../docs/architecture.md) for placement, dependency
  direction, agent-versus-workflow decisions, providers, tools, memory, RAG,
  media, workers, or storage ownership.
- Read [server contract](../../../docs/contracts.md) for transport schemas,
  authentication, streaming, tool round trips, cancellation, versioning, or
  coordinated `reelingo-server` changes.
- Read [engineering workflow](../../../docs/workflow.md) before choosing checks or
  reporting completion.

## Make the change

1. Define the observable AI outcome and the owner: agent, deterministic workflow,
   tool, provider adapter, memory/RAG capability, worker, or transport boundary.
2. Keep SDK and framework types inside adapters. Define narrow project-owned
   inputs, outputs, errors, cancellation, and side effects before implementation.
3. Preserve the service boundary: never access the Reelingo application database
   or accept end-user authorization responsibility.
4. Bound turns, tools, concurrency, timeouts, retries, context, and output. Retry
   only classified transient failures with safe idempotency.
5. Update the executable contract and its owning document together when wire
   behavior changes. Coordinate the server adapter for incompatible changes.
6. Add no placeholder modules and no test/eval artifacts unless explicitly
   requested. Run the verification required by the project workflow.

## Review gates

Before finishing, verify that:

- agents do not construct providers, stores, queues, or HTTP clients;
- known control flow is a workflow rather than an unnecessary agent;
- tools have validated schemas and product-data tools round-trip through the
  server instead of querying its database;
- provider payloads, errors, and secrets do not cross the wire contract;
- streaming emits at most one terminal event and honors cancellation;
- memory/RAG state is AI-owned, namespaced, bounded, and deletable;
- media outputs remain temporary until the server accepts them;
- reported checks prove only what they actually exercised.
