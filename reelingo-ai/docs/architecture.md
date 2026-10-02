# Architecture

`reelingo-ai` is a standalone TypeScript project organized by deployable app and
reusable capability package. It is not a persistence layer for `reelingo-server`
and does not share that server's database.

## Current and planned layout

```text
reelingo-ai/
  apps/
    api/                         # Current internal HTTP streaming service
    worker/                      # Add with the first durable background workload
  packages/
    contracts/                   # Versioned server-to-AI schemas
    agent-core/
      src/
        domain/                  # Provider-independent values
        runtime/                 # Execution contracts, state, and errors
        agents/                  # Add with the first separately configured agent
        workflows/               # Explicit orchestration
        tools/                   # Add with the first real tool
        providers/               # Provider adapters
        memory/                  # Add with the first memory policy/store
        rag/                     # Add with the first ingestion/retrieval path
        media/                   # Add when media execution moves from the server
```

Only create a directory when it contains real code. The planned locations are
ownership decisions, not a requirement to create empty modules.

## Dependency direction

```text
apps/api --------------------> packages/contracts
   |                                   ^
   +----------------> packages/agent-core
                              |
                              +-------> provider SDKs and AI-owned stores

reelingo-server ---- wire contract ----> apps/api
```

- `contracts` depends only on transport-safe schema libraries and plain values.
- `agent-core/domain` and `agent-core/runtime` do not import Express or provider
  SDKs.
- workflows depend on narrow runtime capabilities, not concrete adapters.
- providers implement runtime capabilities and translate external representations.
- `apps/api/src/container.ts` constructs concrete agents, workflows, and routes.
- `reelingo-server` depends on the wire contract, never on agent-core or provider
  implementations.

## Ownership boundary

| Owner             | Responsibilities                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `reelingo-server` | User authentication, ownership, projects, conversations, messages, public SSE, canonical run state, and product asset records        |
| `reelingo-ai`     | Agent behavior, prompt composition, provider selection, tool orchestration, AI-owned memory/RAG, and provider-facing media execution |
| Wire contract     | Correlation, versioning, commands, events, tool round trips, cancellation, and terminal outcomes                                     |

The AI service receives opaque identifiers and the minimum context required for a
run. It must not infer authorization from those identifiers. A product-data tool
round trip is authorized and executed by `reelingo-server` before its result is
returned to the agent.

## Agent versus deterministic behavior

An agent selects an action when the path is genuinely open-ended. Known control
flow remains code:

- media submission, polling, download, and artifact validation are a workflow;
- document parsing, chunking, embedding, and indexing are an ingestion workflow;
- retrieval and reranking are capabilities exposed as a tool when the model needs
  to choose whether to use them;
- short-term and long-term memory are policies and stores, not agents;
- provider routing is configuration or a routing policy unless model judgment is
  explicitly required.

Avoid generic planner/executor base classes. Prefer a concrete workflow and narrow
capability contracts. Add a second agent only when it has distinct instructions,
tools, context, model policy, or ownership of a final answer.

## Providers

Provider adapters expose capability-specific operations. A provider implements
only what it supports, such as conversation, embeddings, image generation, or
video generation. Do not require every provider to implement one broad interface.

Adapters validate provider responses, classify expected failures, preserve causes
for diagnostics, and return project-owned values. Provider selection and fallback
must be explicit. Do not switch providers after streamed output or an irreversible
tool effect unless the protocol defines how duplicates are prevented.

## State and workers

In-memory state is development-only unless loss on restart is part of the
contract. Durable memory, RAG indexes, workflow checkpoints, and media jobs require
AI-owned storage with documented retention and deletion semantics.

Add `apps/worker` when a real workload must outlive the request, such as video
generation or document ingestion. The API submits or resumes work; the worker owns
provider polling and heartbeats. Both processes use the same runtime contracts but
have separate composition roots.
