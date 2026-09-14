# reelingo-server

Backend API for Reelingo — Node.js + Express + TypeScript + Prisma (PostgreSQL),
organized as **feature-first Clean Architecture**.

## Directory layout

```
src/
  config/             # app-config validates env; domain modules feed the public facade
  core/               # Shared abstractions, independent of any concrete framework
    errors/            # AppError and domain errors (NotFoundError, ConflictError, ...)
    http/               # asyncHandler, validate(), sendSuccess()
    i18n/               # Typed en/vi messages, translation and language negotiation
    types/              # Shared types (pagination, ...)
    utils/              # Pure time helpers/constants and network-error classification
  shared/             # Infrastructure shared across features
    database/           # Prisma client singleton
    http/               # Swagger UI and OpenAPI document delivery
    logger/             # Pino logger
    middlewares/        # Request ID, language, rate limit and error handlers
  features/
    <feature>/
      domain/            # Pure entities (no Prisma / Express imports)
      application/       # Use cases, depending on the repository interface in infrastructure
      infrastructure/    # Ports, adapters, and *.mapper.ts exports named toEntity
      presentation/       # Express router, controller, Zod validators, HTTP presenters
      <feature>.module.ts # Composition root: wire domain <-> infra <-> presentation
  app.ts              # Assemble the Express app, mount feature routers
  openapi.ts          # Public API contract, reusing Zod request validators
  server.ts           # Entrypoint: start the HTTP server, graceful shutdown
prisma/
  schema.prisma       # Prisma schema (PostgreSQL)
```

Dependency rule, why the repository interface lives in `infrastructure` instead
of `domain`, and the steps to add a new feature are in
[docs/architecture.md](docs/architecture.md).

For the day-to-day workflow (what to read, which check to run for a given
change) see [AGENTS.md](AGENTS.md) and [docs/development.md](docs/development.md).

## Getting started

```bash
cp .env.example .env
npm ci                        # install dependencies exactly as locked
npm run prisma:migrate        # create tables from prisma/schema.prisma
npm run dev                   # tsx watch, hot reload
```

The first run needs the database role and database to exist already — see
[Database (local)](#database-local).

## Configuration

`src/config/app-config.ts` loads and validates environment variables with Zod
at startup and owns all environment-backed settings. `src/config/config.ts`
exposes the public `config` facade that application code imports — never
`process.env`. `src/shared/http/endpoints.ts` owns static route paths.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | PostgreSQL connection string |
| `DATABASE_CONNECT_TIMEOUT_MS` | no | `3000` | Pool connection/acquisition timeout; max 60,000 ms |
| `DATABASE_QUERY_TIMEOUT_MS` | no | `5000` | PostgreSQL statement and client query timeout; max 60,000 ms |
| `GOOGLE_CLIENT_ID` | yes | — | OAuth client ID the Google ID token must be issued for |
| `GEMINI_API_KEY` | yes | — | Google AI Studio key; server-only |
| `JWT_SECRET` | yes | — | Signing key, at least 32 characters |
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `3000` | HTTP port |
| `LOG_LEVEL` | no | `info` | Pino level |
| `CORS_ORIGIN` | no | `*` | Allowed origin |
| `GEMINI_MODEL` | no | `gemini-2.5-flash` | Model id, changeable without a deploy |
| `GEMINI_TIMEOUT_MS` | no | `30000` | Gemini request timeout; max 300,000 ms |
| `JWT_ISSUER` | no | `reelingo-server` | `iss` claim |
| `JWT_AUDIENCE` | no | `reelingo-api` | `aud` claim |
| `ACCESS_TOKEN_TTL_MINUTES` | no | `15` | Access token lifetime |
| `SESSION_TTL_MINUTES` | no | `10080` | Session and refresh token lifetime (7 days) |
| `AUTH_RATE_LIMIT` | no | `20` | Requests per window on login and refresh |
| `AUTH_RATE_WINDOW_SECONDS` | no | `60` | Auth rate-limit window |
| `API_RATE_LIMIT` | no | `100` | Requests per window on `/api/v1` |
| `API_RATE_WINDOW_SECONDS` | no | `60` | API rate-limit window |

### Secrets

Three variables are secrets. They live only in `.env` (gitignored) or the
deployment's secret store — never in `.env.example`, commits, logs, chat, or
pull-request text.

| Secret | Where it comes from | Notes |
| --- | --- | --- |
| `JWT_SECRET` | Generate locally with the command below | Every environment gets its own value. **Rotating it invalidates every issued access and refresh token**, signing all users out at once — intended when the key is suspected leaked, disruptive otherwise. |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID | Not actually secret (it ships in frontend code), but treat the accompanying *client secret* as one — this server never needs it, so do not store it here. |
| `GEMINI_API_KEY` | Google AI Studio → Get API key | Server-only; billed per call. |

Generate a fresh `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Confirm `.env` holds a real value without printing it:

```bash
node -e "require('dotenv').config(); const s=process.env.JWT_SECRET||''; console.log(s.length, 'chars,', s.startsWith('change-me') ? 'PLACEHOLDER' : 'ok')"
```

## Database (local)

This project uses a **native (Homebrew) PostgreSQL on port 5432**, not the
service in `docker-compose.yml`. Starting that container competes for port 5432
with the native server; connections are routed to the native server instead and
Prisma reports the misleading error `P1010: User was denied access`.

### Create the role and database (one-time)

```bash
psql -U nqbao -d postgres -c "CREATE ROLE reelingo LOGIN CREATEDB PASSWORD 'reelingo';"
```

```bash
psql -U nqbao -d postgres -c "CREATE DATABASE reelingo_dev OWNER reelingo;"
```

The password must match the one in `DATABASE_URL` in your `.env`.

`CREATEDB` is required: `prisma migrate dev` provisions a temporary shadow
database, and without that privilege it fails with `P3014`.

### Check the connection

Work from the lowest layer upward and stop at the first one that fails:

```bash
pg_isready -h localhost -p 5432
```

```bash
lsof -nP -iTCP:5432 -sTCP:LISTEN
```

```bash
psql -h localhost -p 5432 -U reelingo -d reelingo_dev -c "\dt"
```

```bash
npx prisma migrate status
```

| Error message | Cause | Fix |
| --- | --- | --- |
| `Connection refused` | Server not running, or wrong port | Check `pg_isready` |
| `role "..." does not exist` | Role not created yet | See the role step above |
| `database "..." does not exist` | Database not created yet | See the database step above |
| `password authentication failed` | Password differs from `DATABASE_URL` | Align `.env` with the role's password |
| `P1010: User was denied access` | Usually a port-5432 clash with Docker | Check `lsof` |
| `P3014: could not create the shadow database` | Role is missing `CREATEDB` | `ALTER ROLE reelingo CREATEDB;` |

### Inspect the data

```bash
npm run prisma:studio
```

Prisma 7 starts Studio on a **random port** — read the URL from the log it
prints. To pin the port, use `npx prisma studio --port 5555`.

Or use a SQL shell directly:

```bash
psql -h localhost -p 5432 -U reelingo -d reelingo_dev
```

In the shell: `\dt` lists tables, `\d users` shows a table's structure, `\q`
quits.

> Note: Homebrew's `pg_hba.conf` defaults to `trust` for localhost connections,
> so the password is **not verified** during local development. A successful
> connection is therefore no proof that the password in `.env` is correct.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Run the dev server with hot reload (tsx) |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm start` | Run the compiled build (production) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` | Prettier |
| `npm run check` | typecheck + lint |
| `npm test` / `test:watch` | Run/watch Vitest unit and HTTP integration tests |
| `npm run verify` | TypeScript + lint + tests + production build; coverage limits are in docs/development.md |
| `npm run prisma:generate` | Generate the Prisma Client |
| `npm run prisma:migrate` | Run migrations (dev) |
| `npm run prisma:studio` | Open Prisma Studio |

## API

`shared/http/endpoints.ts` defines the shared API prefix (`apiPrefix`, `/api/v1`)
and paths grouped under `auth`, `users`, `ai`, `health`, and `docs`.
Routers and OpenAPI reuse these values. API feature paths are relative to
the prefix; health and documentation paths are mounted at the root.

### Public

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/auth/login/google` | Exchange a Google ID token for an access + refresh token pair |
| `POST` | `/api/v1/auth/refresh` | Rotate a refresh token into a new pair |
| `GET` | `/health` | Health check |
| `GET` | `/ready` | PostgreSQL readiness; 503 when unreachable |
| `GET` | `/docs/` | Swagger UI with JWT authorization |
| `GET` | `/openapi.json` | OpenAPI 3.1 document |

### Requires `Authorization: Bearer <accessToken>`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/me` | Current authenticated user |
| `PATCH` | `/api/v1/me` | Update the current user's name or avatar |
| `POST` | `/api/v1/auth/logout` | Revoke the current session |
| `POST` | `/api/v1/ai/generate` | Generate text from a prompt with Gemini |

## Authentication

The client obtains a Google ID token (Google Identity Services) and posts it to
`/api/v1/auth/login/google`. The server verifies the token's signature with
`google-auth-library`, then finds or creates the matching user and issues its
own JWT pair. Users are matched by Google's permanent `sub` claim only, never
by email, and this login is the sole way an account comes into existence.
Later logins use the stored profile unchanged; Google profile data is written
only when the account is created, and the email is fixed at
creation.

Both tokens of a login share one session id (`sid`), so revoking the session
invalidates the access token and its refresh token together:

- **Access token** — short-lived (`ACCESS_TOKEN_TTL_MINUTES`), sent as
  `Authorization: Bearer <token>`. It never outlives its session.
- **Refresh token** — lives until the session expires
  (`SESSION_TTL_MINUTES`) and is **single-use**: `/auth/refresh` records its
  `jti` in `revoked_keys`, so replaying a stolen refresh token returns 401.
- **Logout** — records the `sid` in `revoked_keys`, which immediately rejects
  every token issued for that session.

`GOOGLE_CLIENT_ID` must be a real OAuth client ID from the Google Cloud
console for login to succeed; the other auth variables have working defaults
in `.env.example`.

## Gemini AI

Set `GEMINI_API_KEY` to an API key from Google AI Studio. `GEMINI_MODEL`
defaults to `gemini-2.5-flash` and can be changed without a code deployment.
The key is server-only and must not be exposed to clients.

`GEMINI_TIMEOUT_MS` sets the provider request timeout (default 30,000 ms;
maximum 300,000 ms). Requests use one attempt so SDK retries do not extend
the configured wait. Timeout failures return `503 SERVICE_UNAVAILABLE`.

Authenticated clients can send a text prompt to Gemini:

```http
POST /api/v1/ai/generate
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "prompt": "Explain the word resilient in Vietnamese." }
```

The response is `{ "success": true, "message": "Text generated successfully", "data": { "text": "..." } }`. Prompts must contain non-whitespace
text and are limited to 8,000 characters. Gemini connectivity, quota, and
empty-response failures return `503 SERVICE_UNAVAILABLE`.

## Request tracing

Responses include `X-Request-ID`, also exposed to browser clients through CORS.
Clients may send a request ID containing 1–128 ASCII letters, digits, dots,
underscores, or hyphens; otherwise the server generates a UUID. HTTP logs and
errors logged through `req.log` carry the same ID in `req.id`.

These patterns are adapted from AIM Core's `src/core/middleware/request_id.py`,
`src/core/logging.py`, and `src/integrations/agent_runtime/adapters/http_adapter.py`
in the AIM OS server repository. Reelingo uses Pino for request-scoped logging
and the Gemini SDK for provider timeouts.

## API envelopes and localization

The API now returns successful payloads inside `data`:

```json
{
  "success": true,
  "message": "Tạo văn bản thành công",
  "data": { "text": "Generated content" }
}
```

Failures have a stable machine-readable code and a localized summary:

```json
{
  "success": false,
  "message": "Dữ liệu yêu cầu không hợp lệ",
  "error": { "code": "VALIDATION_ERROR" }
}
```

Errors may include client-safe `error.details`; Zod validation failures include
per-field `{ path, message }` entries. Internal causes and stack traces are not
returned. This envelope applies to auth, users, AI, route-not-found, malformed
JSON, payload-size, rate-limit and unexpected errors. Status codes keep their
HTTP meaning; DELETE success remains an empty 204. `/health` and `/ready`
return plain probe JSON, and documentation endpoints are not enveloped.

**Client migration:** read generated text from `data.text`, auth tokens from
`data.accessToken` / `data.refreshToken`, and user/list payloads from `data`.
Read error text from top-level `message`; keep branching on `error.code`.
Pagination fields (`items`, `total`, `page`, `pageSize`, `totalPages`) are retained
inside `data`.

Send `X-Language: vi` or `X-Language: en` to choose API message language.
Otherwise the server negotiates `Accept-Language` using quality weights,
supports regional tags such as `vi-VN`, and falls back to English if nothing
matches. A supported explicit `X-Language` takes priority. Responses include
`Content-Language` and `Vary: X-Language, Accept-Language`.

This setting controls API messages only. It does not translate stored content,
select the user's learning language, or change the prompt/response sent to Gemini.

Use cases reference messages through the `I18n` handle — never a raw string —
and put interpolation values in `params`:

```ts
import { I18n } from "@/core/i18n";

throw new NotFoundError(I18n.userNotFound);
throw new ServiceUnavailableError(I18n.serviceUnavailable, { params: { service: "Gemini" } });
```

`I18n` is derived from `en.json` at both runtime and type level — the JSON
key *is* the property name, no case conversion — so it needs no maintenance, offers
autocomplete, and a removed key breaks every caller at compile time — the same
ergonomics as Flutter's generated `AppLocalizations`.

The global Express error handler translates at the HTTP boundary. After shaping
success data with a feature presenter, controllers call
`sendSuccess(res, data, messageKey, statusCode)`. Zod validation issues in a
422 `details` array are localized the same way, per request, via
`zodErrorMap(req.language)`.

### Message catalogs

Catalogs are plain JSON in `src/core/i18n/locales/{en,vi}.json`, in the format
[i18next](https://www.i18next.com/) and translation platforms such as Lokalise
read directly. `src/core/i18n/translator.ts` is the only module that imports
i18next; the rest of the app calls `translate(key, language, params)`.

- Keys are flat `camelCase` that abbreviate the English sentence
  (`"User not found"` → `userNotFound`), identical to the `I18n` property name. No feature prefixes — a message that
  fits two features is one key.
- Placeholders use ICU-style single braces, `{name}` (i18next is configured
  with `prefix: "{"`, `suffix: "}"`).
- `vi.json` must define every key in `en.json`; the catalog map in
  `translator.ts` is typed `Record<MessageKey, string>`, so a missing
  translation is a compile error, not a silent English fallback.
- Language codes live in `src/core/i18n/language-codes.ts` (`LANGUAGE`,
  `SUPPORTED_LANGUAGES`, `DEFAULT_LANGUAGE`); header names live in
  `config.i18n.headers` and `config.http.headers`. Nothing else spells out
  `"en"`, `"vi"`, or `"X-Language"`.
- Language is passed per call (`lng`), never via `i18next.changeLanguage`, so
  concurrent requests cannot leak each other's language.
- Interpolated values are not HTML-escaped (`escapeValue: false`) because
  messages are returned as JSON, never rendered as HTML.

## API documentation and probes

Start the server, open `/docs/`, and use **Authorize** to enter a Reelingo access
token. Swagger serves local assets and reads `/openapi.json`; it does not call
an external schema validator or persist authorization. Request schemas reuse
the runtime Zod validators. Update `src/openapi.ts` when adding endpoints or
changing presenter output.

`GET /health` checks process liveness without querying dependencies.
`GET /ready` executes `SELECT 1` through the real Prisma adapter and returns
`{ "status": "ok", "database": "ok" }` with 200, or
`{ "status": "unavailable", "database": "unreachable" }` with 503. Readiness
responses are not cached. The shared Prisma pool has bounded connection and
query waits controlled by the database timeout settings above. This is a
connectivity probe, not a migration/schema or Gemini availability check.

The patterns are adapted from AIM Core's i18n, error handlers, response
envelope, OpenAPI, and health modules into Reelingo's TypeScript/Express
feature architecture. No Python runtime or AIM Core business modules are used.

The users feature exposes only `GET /api/v1/me` and `PATCH /api/v1/me`.
There is no administrative `/api/v1/users` CRUD API.

### User IDs

User IDs are positive, auto-incrementing PostgreSQL integers. Login and
`/api/v1/me` expose `id` as a JSON number. IDs can have gaps after rolled-back
inserts.
JWT `sub` remains a string containing the decimal user ID.

The `20260914090000_user_integer_ids` migration preserves user profiles and assigns
new integer IDs to existing users. Previously issued UUID-based access and refresh
tokens are rejected; users must sign in with Google again. Clients must discard
cached UUID user IDs when deploying this change.

### Update your profile

`PATCH /api/v1/me` requires `Authorization: Bearer <accessToken>` and a JSON body
with at least one of `name` or `avatarUrl`:

```json
{ "name": "Bao", "avatarUrl": "https://example.com/avatar.jpg" }
```

`name` is trimmed and must contain 1–120 characters. `avatarUrl` must be an HTTP(S)
URL of at most 2048 characters, or `null` to clear it. Omitted fields stay unchanged.
Other fields (including `id`, `email`, and `googleId`) and empty updates return 422.
The endpoint always updates the authenticated user and returns 200 with
`{ success, message, data: { id, email, name, avatarUrl } }`, matching `GET /api/v1/me`.
