ALTER TABLE "ai_generations"
ADD COLUMN "provider" VARCHAR(50),
ADD COLUMN "model" VARCHAR(255);

UPDATE "ai_generations"
SET
  "provider" = 'gemini',
  "model" = CASE "type"
    WHEN 'image'::"asset_kind" THEN 'gemini-3.1-flash-image'
    WHEN 'video'::"asset_kind" THEN 'veo-3.1-fast-generate-preview'
  END;

ALTER TABLE "ai_generations"
ALTER COLUMN "provider" SET NOT NULL,
ALTER COLUMN "model" SET NOT NULL;

ALTER TABLE "ai_generations"
ADD CONSTRAINT "ai_generations_provider_not_empty"
CHECK (LENGTH(BTRIM("provider")) > 0),
ADD CONSTRAINT "ai_generations_model_not_empty"
CHECK (LENGTH(BTRIM("model")) > 0);
