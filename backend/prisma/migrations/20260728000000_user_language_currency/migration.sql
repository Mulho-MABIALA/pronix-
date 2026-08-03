-- =============================================================================
-- Langue principale + devise préférée choisies à l'inscription (ciblage mondial)
-- Convertie depuis migrations/user_language_currency.sql (appliquée
-- manuellement via psql) en vraie migration Prisma, idempotente.
-- =============================================================================

-- Langue principale du compte (fr par défaut pour les comptes existants)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'fr';

-- Devise préférée (NULL = comptes créés avant cette fonctionnalité -> détection auto conservée)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "currency" TEXT;
