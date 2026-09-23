ALTER TABLE "ai_generations"
  ADD COLUMN "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "ai_generations_status_updated_at_id_idx"
  ON "ai_generations"("status", "updated_at", "id");
