-- =============================================================================
-- Langue principale + devise préférée choisies à l'inscription (ciblage mondial)
-- À exécuter sur le serveur : psql $DATABASE_URL -f user_language_currency.sql
-- =============================================================================

-- Langue principale du compte (fr par défaut pour les comptes existants)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'fr';

-- Devise préférée (NULL = comptes créés avant cette fonctionnalité -> détection auto conservée)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "currency" TEXT;
