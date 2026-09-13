# reelingo-server

Backend API cho Reelingo — Node.js + Express + TypeScript + Prisma (PostgreSQL),
tổ chức theo **Clean Architecture, feature-first**.

## Cấu trúc thư mục

```
src/
  config/            # Đọc & validate biến môi trường (Zod)
  core/               # Abstraction dùng chung, không phụ thuộc framework cụ thể
    errors/            # AppError và các lỗi domain (NotFoundError, ConflictError, ...)
    http/               # asyncHandler, validate() middleware factory
    types/              # Kiểu dùng chung (pagination, ...)
  shared/             # Hạ tầng dùng chung giữa các feature
    database/           # Prisma client singleton
    logger/             # Pino logger
    middlewares/        # errorHandler, notFoundHandler
  features/
    <feature>/
      domain/            # Entity thuần (không import Prisma / Express)
      application/       # Use-case, phụ thuộc interface repository trong infrastructure
      infrastructure/    # Repository interface (port) + cài đặt bằng Prisma (adapter)
      presentation/       # Express router, controller, Zod validators (DTO)
      <feature>.module.ts # Composition root: wire domain <-> infra <-> presentation
  app.ts              # Lắp ráp Express app, mount các feature router
  server.ts           # Entrypoint: start HTTP server, graceful shutdown
prisma/
  schema.prisma       # Prisma schema (PostgreSQL)
tests/
  unit/                # Test use-case với in-memory fake repository
  integration/          # Test HTTP endpoint qua supertest
  fakes/                # Fake implementations của repository interface cho test
```

Dependency rule, why the repository interface lives in `infrastructure` instead
of `domain`, and the steps to add a new feature are in
[docs/architecture.md](docs/architecture.md).

For the day-to-day workflow (what to read, which check to run for a given
change) see [AGENTS.md](AGENTS.md) and [docs/development.md](docs/development.md).

## Bắt đầu

```bash
cp .env.example .env
docker compose up -d          # PostgreSQL local
npm run prisma:migrate        # tạo bảng theo prisma/schema.prisma
npm run dev                   # tsx watch, hot reload
```

## Scripts

| Script | Mô tả |
| --- | --- |
| `npm run dev` | Chạy server dev với hot reload (tsx) |
| `npm run build` | Biên dịch TypeScript sang `dist/` |
| `npm start` | Chạy bản build (production) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` | Prettier |
| `npm run check` | typecheck + lint |
| `npm test` / `test:watch` | Vitest |
| `npm run verify` | check + test + build (full gate) |
| `npm run prisma:generate` | Sinh Prisma Client |
| `npm run prisma:migrate` | Chạy migration (dev) |
| `npm run prisma:studio` | Mở Prisma Studio |

## API mẫu (feature `users`)

| Method | Path | Mô tả |
| --- | --- | --- |
| `POST` | `/api/v1/users` | Tạo user |
| `GET` | `/api/v1/users?page=&pageSize=` | Danh sách user (phân trang) |
| `GET` | `/api/v1/users/:id` | Chi tiết user |
| `PATCH` | `/api/v1/users/:id` | Cập nhật user |
| `DELETE` | `/api/v1/users/:id` | Xoá user |
| `GET` | `/health` | Health check |
