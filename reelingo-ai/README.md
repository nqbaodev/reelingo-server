# Reelingo AI

Standalone Node.js and TypeScript service for Reelingo AI orchestration. It owns
model-facing chat behavior and is intentionally isolated from the Reelingo
application database.

Coding agents must start with [AGENTS.md](AGENTS.md), then use the
[documentation map](docs/README.md) and project-owned
[AI development skill](.agents/skills/ai-agent-development/SKILL.md).

## Current boundary

`reelingo-server` calls `POST /v1/chat/respond` with a service Bearer token. The
response is `application/x-ndjson` and emits `assistant.delta`, followed by either
`response.completed` or `response.failed`.

The first extraction keeps durable media generation in `reelingo-server`. The
service returns a typed image/video generation decision so the existing queue and
asset transaction remain correct while media workflows are moved later.

The service must never receive Reelingo database credentials or query the
application database. Future product tools should use versioned `tool.call` and
`tool.result` messages across the service boundary.

## Run locally

```sh
cp .env.example .env
npm ci
npm run dev
```

Configure the same service URL and token in `reelingo-server`:

```env
AI_AGENT_SERVICE_URL=http://127.0.0.1:4100
AI_AGENT_SERVICE_TOKEN=<same independent token>
```

## Project layout

```text
reelingo-ai/
  apps/
    api/
      src/
        config/       # Validated API process configuration
        http/         # Internal routes and service authentication
        container.ts  # API composition root
        app.ts        # Express application
        server.ts     # API process lifecycle
  packages/
    contracts/
      src/            # Versioned server-to-agent schemas
    agent-core/
      src/
        domain/       # Provider-independent agent values
        providers/    # LLM and media provider adapters
        runtime/      # Agent execution contracts and errors
        workflows/    # Explicit agent and capability orchestration
```

The planned `apps/worker` and `agent-core` capabilities such as `tools`, `memory`,
`rag`, and `media` are added only when their first behavior is implemented. This
keeps the intended architecture without empty placeholder modules. Provider SDK
values must never cross the contracts package.
