# Companion app integration

The companion repository is `reelingo-app`, normally checked out beside
`reelingo-server`. Locate it in the current workspace before reading it; do not
assume an absolute developer-specific path exists on CI or another machine.

## Context to read

Start with the app's `AGENTS.md` and `rule.md`, then select relevant references:

- `docs/workflow.md`: task stages, verification, and documentation ownership.
- `docs/architecture.md`: feature boundaries and dependency injection.
- `docs/network.md`: request handling, decoding, Bearer injection, and errors.
- `docs/SECURITY.md`: browser/server boundaries and credential handling.
- `docs/relevance-migration.md`: migrated auth behavior and implementation status.
- `.agents/skills` and `docs/react-skill-guidance.md`: how reusable upstream
  guidance is selected and adapted, not backend coding requirements.

Reading the app is context gathering, not evidence of a working live connection.
Do not copy its credentials or modify its implementation as a side effect of a
backend-only task. When both repositories are in scope, verify each with its own
workflow and report cross-repository compatibility separately.

## Contract review

For API changes, compare backend routes, validators, presenters, and OpenAPI with
the app's adapters and runtime decoders. Check endpoint/base URL composition,
field casing and types, envelopes, status codes, authentication, token rotation,
and user/profile loading. Update docs and affected consumers within task scope;
report consumers outside scope rather than claiming compatibility.

The September 14, 2026 documentation review found a mismatch to resolve during
integration: the app's migration guide describes `id_token`, `refresh_token`,
and snake_case login fields; this backend uses `idToken`, `refreshToken`, and
`data.accessToken` / `data.refreshToken`. Backend login returns tokens only;
the user is loaded through `/api/v1/me`. The app guide says login verifies `/me`
before publishing its session. These observations are from documentation and
backend code, not an end-to-end verification of the current frontend adapter.

Treat that note as a review finding, not an additional API specification. The
backend's [OpenAPI source](../src/openapi.ts) and implementation define its
current contract; update this note after checking and aligning the app adapter.
