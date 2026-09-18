-- Existing timestamps were written as UTC instants. Make that interpretation
-- explicit while changing PostgreSQL storage to timezone-aware timestamps.
ALTER TABLE "users"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3)
    USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3)
    USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "revoked_keys"
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(3)
    USING "expires_at" AT TIME ZONE 'UTC';

CREATE TABLE "conversations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" INTEGER NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversations_user_id_updated_at_id_idx"
  ON "conversations"("user_id", "updated_at" DESC, "id" DESC);

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
