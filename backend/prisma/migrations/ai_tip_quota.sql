-- =============================================================================
-- Quota du générateur de pronostics IA (aiTipController.js)
-- Remplace l'ancien compteur en mémoire (Map()) — non partagé entre les
-- workers PM2 en cluster mode et remis à zéro à chaque redéploiement.
-- À exécuter sur le serveur : psql $DATABASE_URL -f ai_tip_quota.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS "ai_tip_quotas" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "date"      TEXT NOT NULL,
    "count"     INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_tip_quotas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_tip_quotas_userId_date_key" ON "ai_tip_quotas"("userId", "date");

ALTER TABLE "ai_tip_quotas"
  ADD CONSTRAINT "ai_tip_quotas_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
