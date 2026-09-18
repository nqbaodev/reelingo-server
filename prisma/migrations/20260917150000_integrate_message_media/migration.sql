ALTER TABLE "messages"
  DROP CONSTRAINT "messages_payload_check";

ALTER TABLE "messages"
  ADD COLUMN "media_id" UUID,
  DROP COLUMN "media_type",
  DROP COLUMN "media_url",
  DROP COLUMN "thumbnail_url",
  DROP COLUMN "mime_type",
  DROP COLUMN "duration";

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_payload_check" CHECK (
    ("content" IS NULL OR BTRIM("content") <> '')
    AND ("content" IS NOT NULL OR "media_id" IS NOT NULL)
  );

CREATE INDEX "messages_media_id_idx" ON "messages"("media_id");

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_media_id_fkey"
  FOREIGN KEY ("media_id") REFERENCES "media"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
