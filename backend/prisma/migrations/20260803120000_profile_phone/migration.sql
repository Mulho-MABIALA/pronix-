-- =============================================================================
-- Numéro de téléphone dans le profil (affiché/édité depuis la page Profil)
-- Convertie depuis migrations/profile_phone.sql (appliquée manuellement via
-- psql) en vraie migration Prisma, idempotente.
-- =============================================================================

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "phone" TEXT;
