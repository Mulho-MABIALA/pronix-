-- =============================================================================
-- Boîte à suggestions + avis périodique (étoiles + commentaire)
-- À exécuter sur le serveur : psql $DATABASE_URL -f suggestions_reviews.sql
-- =============================================================================

CREATE TYPE "SuggestionStatus" AS ENUM ('NEW', 'READ');

CREATE TABLE IF NOT EXISTS "suggestions" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "message"   TEXT NOT NULL,
    "status"    "SuggestionStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "suggestions_userId_idx" ON "suggestions"("userId");
CREATE INDEX IF NOT EXISTS "suggestions_status_idx" ON "suggestions"("status");

ALTER TABLE "suggestions"
  ADD CONSTRAINT "suggestions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "app_reviews" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "rating"    INTEGER NOT NULL,
    "comment"   TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "app_reviews_userId_idx" ON "app_reviews"("userId");
CREATE INDEX IF NOT EXISTS "app_reviews_createdAt_idx" ON "app_reviews"("createdAt");

ALTER TABLE "app_reviews"
  ADD CONSTRAINT "app_reviews_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastReviewPromptAt" TIMESTAMP(3);
