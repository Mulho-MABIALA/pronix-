-- AlterTable
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "predictions" JSONB;
