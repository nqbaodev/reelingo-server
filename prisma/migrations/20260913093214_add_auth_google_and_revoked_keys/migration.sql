-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "google_id" TEXT;

-- CreateTable
CREATE TABLE "revoked_keys" (
    "key" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revoked_keys_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "revoked_keys_expires_at_idx" ON "revoked_keys"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

