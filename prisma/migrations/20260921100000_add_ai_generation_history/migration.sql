CREATE TYPE "ai_generation_status" AS ENUM ('pending', 'processing', 'completed', 'failed');

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
