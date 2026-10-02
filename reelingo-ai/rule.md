# Project rules

## Language and scope

Use idiomatic TypeScript with strict checking. Write identifiers, comments,
documentation, prompts, and agent instructions in English. Implement the current
requirement with focused changes and avoid speculative abstractions or empty
symmetry folders.

Give functions one cohesive responsibility and name the observable outcome. Keep
queries free of mutation and avoid combined names such as `validateAndExecute`,
`fetchAndTransform`, or `createOrUpdate` unless the underlying operation is a real
atomic upsert.

## Architecture

Follow the ownership and dependency rules in
[architecture](docs/architecture.md):

- `apps/api` owns internal HTTP transport, service authentication, request
  validation, response streaming, and process lifecycle.
- `packages/contracts` owns versioned server-to-AI schemas. It must not import an
  agent framework, provider SDK, Express, or storage implementation.
- `packages/agent-core/domain` owns provider-independent values.
- `packages/agent-core/runtime` owns the execution contracts required by agents
  and workflows.
- `packages/agent-core/workflows` coordinates agent and capability outcomes.
- `packages/agent-core/providers` implements model and media capabilities with
  provider SDKs.
- Composition belongs in an app's `container.ts`; agents and workflows do not
  construct concrete providers, stores, queues, or HTTP clients.

Do not pass Express objects, provider payloads, raw SDK errors, database records,
or framework-specific run state across package boundaries.

## Agents, workflows, and tools

- Use an agent for open-ended decisions where the next step cannot be determined
  reliably in code.
- Use a deterministic workflow for known sequences such as media generation,
  document ingestion, embedding, indexing, retries, or artifact finalization.
- Give every tool a narrow purpose and validated input/output schema. Product-data
  tools emit a request to `reelingo-server` and consume its result; they never
  access the product database directly.
- Bound model turns, tool calls, concurrency, timeouts, retries, and output size.
  Retry only classified transient failures and only when the operation is safe or
  idempotent.
- Treat model output, retrieved text, tool output, URLs, and provider metadata as
  untrusted input. Validate them at their owning boundary.
- Keep prompt behavior versioned and reviewable. Do not hide product policy in an
  adapter solely because the provider consumes the final prompt.

## Memory, RAG, media, and storage

Memory and RAG may use storage owned by `reelingo-ai`, but never share or directly
query the Reelingo application database. Namespace durable state by opaque tenant,
actor, and conversation identifiers supplied through the service contract. Define
retention, deletion, and replacement behavior before persisting user-derived data.

RAG ingestion must preserve source identity and version, validate content, and
support deletion. Retrieval must bound result count and context size and keep
citations tied to source metadata.

Generated media is temporary until `reelingo-server` accepts it. Return typed
artifact metadata or a short-lived download reference; do not create Reelingo
asset records or assume a provider URL is permanent.

## Contracts and security

Follow [the server contract](docs/contracts.md). Version every wire message, use a
correlation ID, validate both inbound and outbound payloads, and emit exactly one
terminal outcome per run. Preserve cancellation and do not silently continue work
after the caller disconnects unless the contract explicitly makes the run durable.

Read environment values only in the owning app config module. Keep provider keys
and service credentials out of code, logs, errors, traces, fixtures, and version
control. Do not reuse `JWT_SECRET` as the service token.

## Verification and maintenance

Use npm and [the engineering workflow](docs/workflow.md). Do not create, modify,
rename, or delete automated test files, snapshots, evaluation datasets, or
test-only fixtures unless the user explicitly requests that scope. Running existing
checks is allowed.

Update the document that owns a changed decision. Keep `AGENTS.md` an entry point,
this file concise, and detailed guidance in `docs/`.
