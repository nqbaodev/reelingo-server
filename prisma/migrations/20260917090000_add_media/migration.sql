CREATE TABLE "media" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" INTEGER NOT NULL,
  "type" "media_type" NOT NULL,
  "storage_key" TEXT NOT NULL,
  "mime_type" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "media_storage_key_key" ON "media"("storage_key");
CREATE INDEX "media_user_id_idx" ON "media"("user_id");

ALTER TABLE "media"
  ADD CONSTRAINT "media_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
