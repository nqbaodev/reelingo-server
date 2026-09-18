# Agent skills

This directory holds skills usable by coding agents that read `AGENTS.md` (Claude
Code, Codex, etc.), not just one tool's own skill mechanism. The installed
skills route work to the repository's source-of-truth rules and docs without
copying their details.

| Skill | Use it for | Read order |
| --- | --- | --- |
| [backend-dev-guidelines](backend-dev-guidelines/SKILL.md) | Node.js, Express, TypeScript, Prisma-backed feature code, HTTP contracts, auth, validation, persistence boundaries, and backend verification. | Read first for backend work. |
| [postgres-db-prisma](postgres-db-prisma/SKILL.md) | PostgreSQL, Prisma schema/migrations, indexes, raw SQL, transactions, connection pooling, query plans, and database performance. | Read after `backend-dev-guidelines` when the task touches database behavior. |

Add another skill only when it provides a distinct reusable workflow or external
guidance; do not restate decisions already owned by [rule.md](../../rule.md) or
[docs](../../docs/README.md).

## Convention

A skill lives at `.agents/skills/<skill-name>/SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: What it's for and when an agent should reach for it — specific
  enough to trigger correctly, since this is the only text used to decide
  relevance before the full skill is loaded.
license: ...
---
```

Keep `SKILL.md` itself scannable — a quick-reference index, not the full
content. When a skill covers many discrete rules (see an example of this
shape in reelingo's own `vercel-react-best-practices` skill), split each rule
into its own file under `rules/<rule-id>.md` and link to it from the index
instead of inlining everything into `SKILL.md`.

Before installation, review provenance, license, executable scripts, and runtime
assumptions. Installation does not imply executing bundled scripts or adopting
dependencies. Read only the full rules relevant to the current task. Keep upstream
files separate from local applicability notes; put corrections and adaptations
in `docs/` and link them from the documentation map. Recheck those notes on updates.

Record project-specific decisions (how *this* project applies a skill's
general guidance) in the linked project documents — `rule.md` or `docs/` — and
link to them from the skill if needed, rather than duplicating them inside
the skill. For example, chat contracts live in [docs/chat.md](../../docs/chat.md),
while the backend skill only routes relevant work to that document. If two skills
appear to disagree, follow [rule.md](../../rule.md), [docs](../../docs/README.md),
and the narrower feature document, then update the stale skill instead of
silently choosing one.
