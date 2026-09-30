ALTER TYPE "media_type" RENAME TO "asset_kind";

ALTER TABLE "media" RENAME TO "assets";
ALTER TABLE "assets" RENAME COLUMN "type" TO "kind";
ALTER TABLE "assets" RENAME CONSTRAINT "media_pkey" TO "assets_pkey";
ALTER TABLE "assets" RENAME CONSTRAINT "media_user_id_fkey" TO "assets_user_id_fkey";
ALTER INDEX "media_storage_key_key" RENAME TO "assets_storage_key_key";
DROP INDEX "media_user_id_idx";
CREATE INDEX "assets_user_id_created_at_id_idx"
  ON "assets"("user_id", "created_at" DESC, "id" DESC);
CREATE INDEX "assets_user_id_kind_created_at_id_idx"
  ON "assets"("user_id", "kind", "created_at" DESC, "id" DESC);

ALTER TABLE "message_media" RENAME TO "message_assets";
ALTER TABLE "message_assets" RENAME COLUMN "media_id" TO "asset_id";
ALTER TABLE "message_assets"
  RENAME CONSTRAINT "message_media_pkey" TO "message_assets_pkey";
ALTER TABLE "message_assets"
  RENAME CONSTRAINT "message_media_message_id_fkey" TO "message_assets_message_id_fkey";
ALTER TABLE "message_assets"
  RENAME CONSTRAINT "message_media_media_id_fkey" TO "message_assets_asset_id_fkey";
ALTER INDEX "message_media_message_id_position_key"
  RENAME TO "message_assets_message_id_position_key";
ALTER INDEX "message_media_media_id_idx"
  RENAME TO "message_assets_asset_id_idx";
