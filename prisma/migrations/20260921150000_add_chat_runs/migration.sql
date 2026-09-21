CREATE TYPE "chat_run_status" AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE "chat_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "trigger_message_id" UUID NOT NULL,
  "result_message_id" UUID,
  "status" "chat_run_status" NOT NULL DEFAULT 'pending',
  "context_snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "chat_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_runs_context_snapshot_object_check"
    CHECK (jsonb_typeof("context_snapshot") = 'object')
);

CREATE UNIQUE INDEX "chat_runs_trigger_message_id_key"
  ON "chat_runs"("trigger_message_id");
CREATE UNIQUE INDEX "chat_runs_result_message_id_key"
  ON "chat_runs"("result_message_id");
CREATE INDEX "chat_runs_status_updated_at_id_idx"
  ON "chat_runs"("status", "updated_at", "id");

ALTER TABLE "chat_runs"
  ADD CONSTRAINT "chat_runs_trigger_message_id_fkey"
  FOREIGN KEY ("trigger_message_id") REFERENCES "messages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_runs"
  ADD CONSTRAINT "chat_runs_result_message_id_fkey"
  FOREIGN KEY ("result_message_id") REFERENCES "messages"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
