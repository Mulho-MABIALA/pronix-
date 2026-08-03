-- =============================================================================
-- Numéro de téléphone dans le profil (affiché/édité depuis la page Profil)
-- À exécuter sur le serveur : psql $DATABASE_URL -f profile_phone.sql
-- =============================================================================

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "phone" TEXT;
