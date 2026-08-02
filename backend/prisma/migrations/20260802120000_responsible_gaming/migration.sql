-- Migration: jeu responsable — confirmation d'âge (18+) + auto-exclusion temporaire
-- 20260802120000

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ageConfirmedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "selfExclusionUntil" TIMESTAMP(3);
