# Agent skills

This directory holds portable skills — usable by any coding agent that reads
`AGENTS.md` (Claude Code, Codex, etc.), not just one tool's own skills
mechanism. None are installed yet: this project's own workflow lives directly
in [AGENTS.md](../../AGENTS.md), [rule.md](../../rule.md), and
[docs/](../../docs) — add a skill here only when guidance is genuinely
reusable beyond this repo (a library's best-practice rules, a design system
guide), not to restate project-specific decisions that already have a home in
those documents.

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

Record project-specific decisions (how *this* project applies a skill's
general guidance) in the linked project documents — `rule.md` or `docs/` — and
link to them from the skill if needed, rather than duplicating them inside
the skill.
