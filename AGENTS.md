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

## Local database

PostgreSQL runs as a **native Homebrew service on port 5432**, not the
`docker-compose.yml` service. Starting the container conflicts on that port and
connections silently reach the native server instead, surfacing as a misleading
Prisma `P1010: User was denied access`. Setup steps and connection checks are in
[README.md](README.md#database-local).

The `reelingo` role needs `CREATEDB` — `prisma migrate dev` provisions a shadow
database and fails with `P3014` without it.

## Authentication

Routers mounted under `/api/v1` in `app.ts` sit behind `authModule.authenticate`,
so **a new route is authenticated by default** and returns 401 without an
`Authorization: Bearer <accessToken>` header. Reach the caller through
`req.auth` (`{ user, claims }`), never by decoding the token again. To expose a
route publicly, mount it on the auth module's own unguarded router.

Sessions, single-use refresh tokens, and the `revoked_keys` table are described
in [README.md](README.md#authentication).

## Configuration

Every setting is read from `config` (`@/config`). Add one by validating it in
`src/config/env.ts`, then exposing it through the matching group in
`src/config/config.ts`; do not read `process.env` elsewhere. When you add a
variable, update all three of `.env.example`, the README table, and
`tests/setup.ts` (required variables only) in the same change.

## Secrets

`JWT_SECRET`, `GEMINI_API_KEY`, and any Google *client secret* are secrets.
The full list, sources, and generation command are in
[README.md](README.md#secrets).

- Never print a secret's value into the conversation, a log line, a commit, or
  a PR description — not even to "confirm it is set". Check length or prefix
  instead (the README shows how).
- Generate new secrets with `crypto.randomBytes`; never invent or reuse one.
- `.env` is gitignored and is the only local home for real values;
  `.env.example` holds placeholders only.
- Do not change `JWT_SECRET` as a side effect of other work: rotating it signs
  every user out.

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
