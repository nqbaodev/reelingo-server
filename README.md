# reelingo-server

Backend API for Reelingo — Node.js + Express + TypeScript + Prisma (PostgreSQL),
organized as **feature-first Clean Architecture**.

## Directory layout

```
src/
  config/            # Read & validate environment variables (Zod)
  core/               # Shared abstractions, independent of any concrete framework
    errors/            # AppError and domain errors (NotFoundError, ConflictError, ...)
    http/               # asyncHandler, validate() middleware factory
    types/              # Shared types (pagination, ...)
  shared/             # Infrastructure shared across features
    database/           # Prisma client singleton
    logger/             # Pino logger
    middlewares/        # errorHandler, notFoundHandler
  features/
    <feature>/
      domain/            # Pure entities (no Prisma / Express imports)
      application/       # Use cases, depending on the repository interface in infrastructure
      infrastructure/    # Repository interface (port) + Prisma implementation (adapter)
      presentation/       # Express router, controller, Zod validators (DTO)
      <feature>.module.ts # Composition root: wire domain <-> infra <-> presentation
  app.ts              # Assemble the Express app, mount feature routers
  server.ts           # Entrypoint: start the HTTP server, graceful shutdown
prisma/
  schema.prisma       # Prisma schema (PostgreSQL)
tests/
  integration/          # HTTP endpoint tests through supertest
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
| `npm test` / `test:watch` | Vitest |
| `npm run verify` | check + test + build (full gate) |
| `npm run prisma:generate` | Generate the Prisma Client |
| `npm run prisma:migrate` | Run migrations (dev) |
| `npm run prisma:studio` | Open Prisma Studio |

## Example API (feature `users`)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/users` | Create a user |
| `GET` | `/api/v1/users?page=&pageSize=` | List users (paginated) |
| `GET` | `/api/v1/users/:id` | Get a user |
| `PATCH` | `/api/v1/users/:id` | Update a user |
| `DELETE` | `/api/v1/users/:id` | Delete a user |
| `GET` | `/health` | Health check |
