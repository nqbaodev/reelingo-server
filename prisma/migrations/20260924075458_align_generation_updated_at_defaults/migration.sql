-- AlterTable
ALTER TABLE "ai_generations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "chat_runs" ALTER COLUMN "updated_at" DROP DEFAULT;
