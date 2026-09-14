-- Preserve user profiles while assigning new, auto-incrementing IDs.
-- Existing JWT subjects contain UUIDs and require a fresh Google login.
BEGIN;
ALTER TABLE "users" ADD COLUMN "integer_id" SERIAL NOT NULL;
ALTER TABLE "users" DROP CONSTRAINT "users_pkey";
ALTER TABLE "users" DROP COLUMN "id";
ALTER TABLE "users" RENAME COLUMN "integer_id" TO "id";
ALTER SEQUENCE "users_integer_id_seq" RENAME TO "users_id_seq";
ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
COMMIT;
