# AGENTS.md

## Project

**reelingo-ai** — Reelingo's standalone Node.js and TypeScript AI orchestration
service. It owns provider-facing agents and is called by `reelingo-server`
through a versioned internal contract.

Read [rule.md](rule.md) before changing code. Use
[the engineering workflow](docs/workflow.md) to choose verification and
[the docs index](docs/README.md) to find the document that owns a decision.

Read task-specific guidance as needed:

- [Architecture](docs/architecture.md): app/package ownership, dependency
  direction, agents, workflows, tools, providers, memory, RAG, and media.
- [Server contract](docs/contracts.md): service authentication, request and event
  schemas, streaming rules, and cross-repository compatibility.
- [AI agent development skill](.agents/skills/ai-agent-development/SKILL.md): task
  routing and review gates for implementation and refactoring.
- [Agent skills](.agents/skills/README.md): skill ownership and conventions.

## Critical boundaries

- Never connect to, query, or mutate the `reelingo-server` database. Product data
  is available only through explicit versioned commands, events, or tool results.
- Keep provider SDK payloads, errors, and credentials inside provider adapters.
- `reelingo-server` remains the authority for end-user authentication, ownership,
  conversations, messages, and public API behavior.
- Use an independent service credential. Never reuse or request `JWT_SECRET`, a
  user access token, or database credentials.
- Do not create placeholder modules. Add `worker`, `tools`, `memory`, `rag`, or
  `media` directories only with their first real behavior.

## Working guidelines

State assumptions that affect behavior, keep changes focused, and verify the
observable outcome. Update the owning document when a contract or architectural
decision changes; link instead of duplicating it.

## Commands

Use npm from this directory:

```sh
npm run check       # TypeScript + lint
npm run build       # Production build
npm run verify      # Check + production build
```

For a server-contract change, also run the relevant `reelingo-server` checks and
exercise the real internal HTTP stream. Documentation-only changes require reading
the final text and checking links; they do not require an application build.
