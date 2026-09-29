CREATE TABLE "projects" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" INTEGER NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "projects_title_check" CHECK (BTRIM("title") <> '')
);

CREATE INDEX "projects_user_id_updated_at_id_idx"
  ON "projects"("user_id", "updated_at" DESC, "id" DESC);

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve existing conversations by grouping each user's conversations into
-- one private project before making project ownership mandatory.
INSERT INTO "projects" (
  "id",
  "user_id",
  "title",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  conversation."user_id",
  'Imported conversations',
  MIN(conversation."created_at"),
  MAX(conversation."updated_at")
FROM "conversations" AS conversation
GROUP BY conversation."user_id";

ALTER TABLE "conversations"
  ADD COLUMN "project_id" UUID;

UPDATE "conversations" AS conversation
SET "project_id" = project."id"
FROM "projects" AS project
WHERE project."user_id" = conversation."user_id";

ALTER TABLE "conversations"
  ALTER COLUMN "project_id" SET NOT NULL;

DROP INDEX "conversations_user_id_updated_at_id_idx";

ALTER TABLE "conversations"
  DROP CONSTRAINT "conversations_user_id_fkey",
  DROP COLUMN "user_id";

CREATE INDEX "conversations_project_id_updated_at_id_idx"
  ON "conversations"("project_id", "updated_at" DESC, "id" DESC);

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
