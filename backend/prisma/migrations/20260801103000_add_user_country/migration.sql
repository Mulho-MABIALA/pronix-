-- Migration: ajout du pays utilisateur (choisi à l'onboarding)
-- 20260801103000

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" TEXT;

CREATE INDEX IF NOT EXISTS "users_country_idx" ON "users"("country");
