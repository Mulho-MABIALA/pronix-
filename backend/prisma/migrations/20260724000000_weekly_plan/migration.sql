-- =============================================================================
-- Abonnement hebdomadaire (billingCycle WEEKLY + priceWeekly sur les plans)
-- Convertie depuis migrations/weekly_plan.sql (appliquée manuellement via
-- psql) en vraie migration Prisma, idempotente (IF NOT EXISTS partout).
-- =============================================================================

-- Nouvelle valeur d'enum pour le cycle de facturation
ALTER TYPE "BillingCycle" ADD VALUE IF NOT EXISTS 'WEEKLY' BEFORE 'MONTHLY';

-- Prix hebdomadaire par plan (0 par défaut tant que non configuré en admin)
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "priceWeekly" INTEGER NOT NULL DEFAULT 0;

-- Backfill du prix hebdo pour le plan Premium existant (≈35% du prix mensuel,
-- même ratio que la concurrence hebdo/mensuel observée sur le marché)
UPDATE "plans" SET "priceWeekly" = 1800 WHERE "code" = 'PREMIUM' AND "priceWeekly" = 0;
