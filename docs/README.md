# Documentation map

## Instruction ownership

| Location | Purpose |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | Agent entry point, navigation, and critical local constraints |
| [rule.md](../rule.md) | Concise project-wide engineering conventions |
| [architecture.md](architecture.md) | Ownership, dependencies, services, and mapping decisions |
| [backend.md](backend.md) | Detailed backend implementation and security guidance |
| [workflow.md](workflow.md) | Task stages, risk profiles, verification, and evidence |
| [app-integration.md](app-integration.md) | Companion frontend discovery and API compatibility |
| [chat.md](chat.md) | Conversation, message, media, and chat API decisions |
| [README.md](../README.md) | Setup, environment variables, API usage, and operations |
| [.agents/skills](../.agents/skills/README.md) | Optional portable skills with task-specific guidance |

Keep one detailed source of truth for each decision. Entry points may summarize
critical constraints, but should link to the explanation. Read only references
relevant to the task; do not load every skill or its compiled instructions.

## Agents and skills

`AGENTS.md` is guidance for a coding agent. `.agents/skills` contains reusable
instructions; it does not run agents, schedule work, or install services. The
project-owned `backend-dev-guidelines` skill routes backend work to these docs;
the `postgres-db-prisma` skill adds database-specific judgment for Prisma,
PostgreSQL, migrations, indexes, transactions, connection pooling, raw SQL, and
query-performance work. Skills do not replace the source-of-truth docs; they tell
an agent which source to read and which evidence to collect.

When adopting a skill, review its sources, runtime assumptions, and conflicts
with project rules. Keep upstream material separate from project-specific
decisions and record applicability/corrections in docs. Do not automatically
import frontend, Next.js, vendor, or microservice requirements into this backend.

This structure follows the companion app's separation of entry point, short rules,
task-specific docs, and optional skills. Each repository owns its own architecture
and verification commands; frontend instructions do not govern backend changes.
