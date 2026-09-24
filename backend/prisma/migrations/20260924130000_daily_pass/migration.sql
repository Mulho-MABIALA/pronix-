-- =============================================================================
-- Pass Jour : accès Premium 24h en paiement unique (billingCycle DAILY +
-- priceDaily sur les plans). Idempotente (IF NOT EXISTS partout), même
-- modèle que 20260724000000_weekly_plan.
-- =============================================================================

-- Nouvelle valeur d'enum pour le cycle de facturation
ALTER TYPE "BillingCycle" ADD VALUE IF NOT EXISTS 'DAILY' BEFORE 'WEEKLY';

-- Prix du Pass Jour par plan (0 = formule non proposée pour ce plan)
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "priceDaily" INTEGER NOT NULL DEFAULT 0;

-- 300 FCFA pour le Premium : 7 pass (2 100) coûtent plus qu'une semaine
-- (1 800) → l'hebdo reste l'offre avantageuse pour les utilisateurs réguliers.
UPDATE "plans" SET "priceDaily" = 300 WHERE "code" = 'PREMIUM' AND "priceDaily" = 0;
