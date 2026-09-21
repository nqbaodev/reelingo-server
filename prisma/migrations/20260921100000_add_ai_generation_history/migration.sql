CREATE TYPE "ai_generation_status" AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE "message_media" (
  "message_id" UUID NOT NULL,
  "media_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,

  CONSTRAINT "message_media_pkey" PRIMARY KEY ("message_id", "media_id")
);

INSERT INTO "message_media" ("message_id", "media_id", "position")
SELECT "id", "media_id", 0
FROM "messages"
WHERE "media_id" IS NOT NULL;

ALTER TABLE "messages" DROP CONSTRAINT "messages_payload_check";
ALTER TABLE "messages" DROP CONSTRAINT "messages_media_id_fkey";
DROP INDEX "messages_media_id_idx";
ALTER TABLE "messages" DROP COLUMN "media_id";

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_content_check"
  CHECK ("content" IS NULL OR BTRIM("content") <> '');

CREATE UNIQUE INDEX "message_media_message_id_position_key"
  ON "message_media"("message_id", "position");
CREATE INDEX "message_media_media_id_idx"
  ON "message_media"("media_id");

ALTER TABLE "message_media"
  ADD CONSTRAINT "message_media_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "messages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_media"
  ADD CONSTRAINT "message_media_media_id_fkey"
  FOREIGN KEY ("media_id") REFERENCES "media"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ai_generations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "trigger_message_id" UUID NOT NULL,
  "result_message_id" UUID,
  "type" "media_type" NOT NULL,
  "status" "ai_generation_status" NOT NULL DEFAULT 'pending',
  "config_snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_generations_config_snapshot_object_check"
    CHECK (jsonb_typeof("config_snapshot") = 'object')
);

CREATE UNIQUE INDEX "ai_generations_trigger_message_id_key"
  ON "ai_generations"("trigger_message_id");
CREATE UNIQUE INDEX "ai_generations_result_message_id_key"
  ON "ai_generations"("result_message_id");
CREATE INDEX "ai_generations_status_created_at_id_idx"
  ON "ai_generations"("status", "created_at", "id");

ALTER TABLE "ai_generations"
  ADD CONSTRAINT "ai_generations_trigger_message_id_fkey"
  FOREIGN KEY ("trigger_message_id") REFERENCES "messages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generations"
  ADD CONSTRAINT "ai_generations_result_message_id_fkey"
  FOREIGN KEY ("result_message_id") REFERENCES "messages"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
