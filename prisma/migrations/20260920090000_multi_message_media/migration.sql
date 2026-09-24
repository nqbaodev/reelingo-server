CREATE TABLE "message_media" (
  "message_id" UUID NOT NULL,
  "media_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "message_media_pkey" PRIMARY KEY ("message_id", "media_id")
);
CREATE UNIQUE INDEX "message_media_message_id_position_key" ON "message_media"("message_id", "position");
CREATE INDEX "message_media_media_id_idx" ON "message_media"("media_id");
ALTER TABLE "message_media" ADD CONSTRAINT "message_media_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_media" ADD CONSTRAINT "message_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
INSERT INTO "message_media" ("message_id", "media_id", "position")
SELECT "id", "media_id", 0 FROM "messages" WHERE "media_id" IS NOT NULL;
ALTER TABLE "messages" DROP CONSTRAINT "messages_payload_check";
ALTER TABLE "messages" ADD CONSTRAINT "messages_content_check" CHECK ("content" IS NULL OR BTRIM("content") <> '');
ALTER TABLE "messages" DROP CONSTRAINT "messages_media_id_fkey";
DROP INDEX "messages_media_id_idx";
ALTER TABLE "messages" DROP COLUMN "media_id";
