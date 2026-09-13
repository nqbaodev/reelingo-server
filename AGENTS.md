# AGENTS.md

## Project

**reelingo-server** — backend API for Reelingo, built with Node.js, Express, and
TypeScript, using Prisma (PostgreSQL) for persistence.

Read and follow [rule.md](rule.md) when working with code in this project.
Use [the development workflow](docs/development.md) to select verification and
find the relevant project documentation.

Read task-specific guidance as needed:

- [Architecture](docs/architecture.md): feature ownership, layering, dependency
  rule, and how to add a feature.

## Working guidelines

**Think before coding.** State assumptions that affect the outcome; ask when missing
information determines scope or behavior.

**Simplicity first.** Implement only the current request. Do not add sample logic,
speculative features, or unnecessary abstractions.

**Focused changes.** Match the existing code style. Leave unrelated code alone;
remove unused code introduced by your changes.

**Verify the result.** Run checks appropriate to the change and report anything
that remains unverified.

## Commands

Use npm. Run `check` after code or configuration changes; use `verify` for
dependency, schema, or cross-layer changes. See the workflow for behavior tests
and manual HTTP verification.

```sh
npm run check                 # TypeScript + lint
npm run verify                # Full gate: check + tests + production build
```
