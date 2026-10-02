# Server contract

This document owns the internal integration between `reelingo-server` and
`reelingo-ai`. The schemas in `packages/contracts` are the executable AI-side
contract.

## Current chat request

`reelingo-server` calls:

```text
POST /v1/chat/respond
Authorization: Bearer <service token>
Accept: application/x-ndjson
Content-Type: application/json
```

The request contains `protocolVersion`, `requestId`, `content`, and nullable
`intentHint`. The caller supplies a UUID request ID. Version 1 accepts `image` or
`video` as hints; a hint is not sufficient by itself to trigger generation.

The response is newline-delimited JSON with zero or more `assistant.delta` events
and exactly one terminal event:

- `response.completed` contains a provider-independent reply or media-generation
  decision;
- `response.failed` contains a stable internal error code and no raw provider
  details.

Every event repeats the request's `protocolVersion` and `requestId`. Deltas occur
before the terminal event. The service closes the response after the terminal
event and stops the provider request when the caller disconnects.

## Authentication and trust

The service Bearer token authenticates `reelingo-server`, not an end user. It must
be an independent secret shared only between the two services and transported over
TLS outside local development. The AI service does not accept end-user access
tokens and does not decide project or resource ownership.

All request content and future tool results are untrusted. Validate them before
they enter agent or provider behavior. Do not serialize provider errors, stack
traces, prompts containing secrets, or credentials into an event.

## Contract changes

Classify changes before editing:

- compatible: add an optional field with an explicit default or add an event the
  current consumer can safely ignore;
- incompatible: rename/remove a field, change meaning or nullability, reorder
  required lifecycle events, or change terminal behavior.

Incompatible changes require a new protocol version and a coordinated server
adapter change. Until `packages/contracts` is published as a shared package, update
both it and
`../../src/infrastructure/clients/ai-agent/remote-ai-agent.client.ts` together.

## Future bidirectional tools

Product-data tools are not implemented yet. When introduced, extend the contract
with correlated `tool.call` and `tool.result` messages. The server validates the
tool allowlist, arguments, user authorization, and ownership before executing its
application use case. The AI service never receives database credentials or calls
Prisma.

Long-running media and ingestion require a durable run identifier, idempotency,
cancellation, replay or status recovery, and artifact lifecycle semantics before
they move across this boundary.
