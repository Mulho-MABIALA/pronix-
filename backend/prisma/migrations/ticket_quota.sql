-- =============================================================================
-- Quota du générateur de tickets (3 générations/jour gratuites)
-- À exécuter sur le serveur : psql $DATABASE_URL -f ticket_quota.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS "ticket_quotas" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "date"      TEXT NOT NULL,
    "count"     INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_quotas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_quotas_userId_date_key" ON "ticket_quotas"("userId", "date");

ALTER TABLE "ticket_quotas"
  ADD CONSTRAINT "ticket_quotas_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
