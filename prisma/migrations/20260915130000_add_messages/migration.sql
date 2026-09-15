CREATE TYPE "message_role" AS ENUM ('user', 'assistant');
CREATE TYPE "media_type" AS ENUM ('image', 'video');

CREATE TABLE "messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL,
  "role" "message_role" NOT NULL,
  "content" TEXT,
  "media_type" "media_type",
  "media_url" TEXT,
  "thumbnail_url" TEXT,
  "mime_type" VARCHAR(255),
  "duration" DOUBLE PRECISION,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "messages_payload_check" CHECK (
    (
      "content" IS NOT NULL
      AND BTRIM("content") <> ''
      AND "media_type" IS NULL
      AND "media_url" IS NULL
      AND "thumbnail_url" IS NULL
      AND "mime_type" IS NULL
      AND "duration" IS NULL
    )
    OR
    (
      "media_type" IS NOT NULL
      AND "media_type" = 'image'
      AND ("content" IS NULL OR BTRIM("content") <> '')
      AND "media_url" IS NOT NULL
      AND "thumbnail_url" IS NULL
      AND "mime_type" IS NOT NULL
      AND LOWER("mime_type") LIKE 'image/%'
      AND "duration" IS NULL
    )
    OR
    (
      "media_type" IS NOT NULL
      AND "media_type" = 'video'
      AND ("content" IS NULL OR BTRIM("content") <> '')
      AND "media_url" IS NOT NULL
      AND "mime_type" IS NOT NULL
      AND LOWER("mime_type") LIKE 'video/%'
      AND "duration" IS NOT NULL
      AND "duration" > 0
    )
  )
);

CREATE INDEX "messages_conversation_id_created_at_id_idx"
  ON "messages"("conversation_id", "created_at" DESC, "id" DESC);

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
