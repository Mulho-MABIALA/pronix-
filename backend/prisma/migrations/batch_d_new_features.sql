-- =============================================================================
-- BATCH D — Migration : 10 nouvelles fonctionnalités
-- À exécuter sur le serveur : psql $DATABASE_URL -f batch_d_new_features.sql
-- =============================================================================

-- ─── TipCombo (combinés / coupons multi-sélections) ──────────────────────────
CREATE TABLE IF NOT EXISTS "TipCombo" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"     TEXT NOT NULL,
  "title"      TEXT NOT NULL,
  "totalOdds"  DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "isPremium"  BOOLEAN NOT NULL DEFAULT FALSE,
  "result"     TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TipCombo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TipComboEntry" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "comboId"    TEXT NOT NULL,
  "matchId"    TEXT NOT NULL,
  "prediction" TEXT NOT NULL,
  "odds"       DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "result"     TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TipComboEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TipCombo"
  ADD CONSTRAINT "TipCombo_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "TipComboEntry"
  ADD CONSTRAINT "TipComboEntry_comboId_fkey"
  FOREIGN KEY ("comboId") REFERENCES "TipCombo"("id") ON DELETE CASCADE;

ALTER TABLE "TipComboEntry"
  ADD CONSTRAINT "TipComboEntry_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "TipCombo_userId_idx"    ON "TipCombo"("userId");
CREATE INDEX IF NOT EXISTS "TipComboEntry_comboId_idx" ON "TipComboEntry"("comboId");
CREATE UNIQUE INDEX IF NOT EXISTS "TipComboEntry_comboId_matchId_key"
  ON "TipComboEntry"("comboId", "matchId");

-- ─── TipsterFollow (abonnement gratuit aux tipsters) ─────────────────────────
CREATE TABLE IF NOT EXISTS "TipsterFollow" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "followerId"  TEXT NOT NULL,
  "tipsterId"   TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TipsterFollow_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TipsterFollow"
  ADD CONSTRAINT "TipsterFollow_followerId_fkey"
  FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "TipsterFollow"
  ADD CONSTRAINT "TipsterFollow_tipsterId_fkey"
  FOREIGN KEY ("tipsterId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "TipsterFollow_followerId_tipsterId_key"
  ON "TipsterFollow"("followerId", "tipsterId");

-- ─── TipComment (commentaires sur un pronostic) ───────────────────────────────
CREATE TABLE IF NOT EXISTS "TipComment" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tipId"     TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TipComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TipComment"
  ADD CONSTRAINT "TipComment_tipId_fkey"
  FOREIGN KEY ("tipId") REFERENCES "Tip"("id") ON DELETE CASCADE;

ALTER TABLE "TipComment"
  ADD CONSTRAINT "TipComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "TipComment_tipId_idx" ON "TipComment"("tipId");

-- ─── EventLog (analytics / événements utilisateur) ───────────────────────────
CREATE TABLE IF NOT EXISTS "EventLog" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"     TEXT,
  "event"      TEXT NOT NULL,
  "entityId"   TEXT,
  "metadata"   JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EventLog_event_createdAt_idx" ON "EventLog"("event", "createdAt");
CREATE INDEX IF NOT EXISTS "EventLog_userId_idx"           ON "EventLog"("userId");

-- ─── VirtualWallet + VirtualBet (portefeuille virtuel / gamification) ─────────
CREATE TABLE IF NOT EXISTS "VirtualWallet" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"     TEXT NOT NULL,
  "balance"    INTEGER NOT NULL DEFAULT 1000,
  "totalWon"   INTEGER NOT NULL DEFAULT 0,
  "totalLost"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VirtualWallet_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VirtualWallet"
  ADD CONSTRAINT "VirtualWallet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "VirtualWallet_userId_key" ON "VirtualWallet"("userId");

CREATE TABLE IF NOT EXISTS "VirtualBet" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "walletId"    TEXT NOT NULL,
  "matchId"     TEXT NOT NULL,
  "prediction"  TEXT NOT NULL,
  "odds"        DOUBLE PRECISION NOT NULL,
  "stake"       INTEGER NOT NULL,
  "payout"      INTEGER,
  "result"      TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VirtualBet_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VirtualBet"
  ADD CONSTRAINT "VirtualBet_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "VirtualWallet"("id") ON DELETE CASCADE;

ALTER TABLE "VirtualBet"
  ADD CONSTRAINT "VirtualBet_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "VirtualBet_walletId_idx" ON "VirtualBet"("walletId");

-- ─── OddsAlert (alertes sur les cotes) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "OddsAlert" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"       TEXT NOT NULL,
  "teamName"     TEXT NOT NULL,
  "targetOdds"   DOUBLE PRECISION NOT NULL,
  "condition"    TEXT NOT NULL DEFAULT 'above',
  "isActive"     BOOLEAN NOT NULL DEFAULT TRUE,
  "triggeredAt"  TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OddsAlert_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OddsAlert"
  ADD CONSTRAINT "OddsAlert_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "OddsAlert_userId_isActive_idx" ON "OddsAlert"("userId", "isActive");

-- ─── TipsterWeeklyStats (historique ROI hebdomadaire pour graphes) ─────────────
CREATE TABLE IF NOT EXISTS "TipsterWeeklyStats" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"       TEXT NOT NULL,
  "weekStart"    TIMESTAMP(3) NOT NULL,
  "tips"         INTEGER NOT NULL DEFAULT 0,
  "correct"      INTEGER NOT NULL DEFAULT 0,
  "successRate"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "roi"          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TipsterWeeklyStats_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TipsterWeeklyStats"
  ADD CONSTRAINT "TipsterWeeklyStats_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "TipsterWeeklyStats_userId_weekStart_key"
  ON "TipsterWeeklyStats"("userId", "weekStart");

-- ─── Colonnes de relations ajoutées aux modèles existants ─────────────────────
-- (ces colonnes sont des relations Prisma virtuelles, aucune colonne SQL à créer)
-- User.combos, User.following, User.followers, User.tipComments,
-- User.virtualWallet, User.oddsAlerts, User.weeklyStats
-- Match.comboEntries, Match.virtualBets
-- Tip.comments
-- => Aucune ALTER TABLE nécessaire : ce sont des back-relations Prisma pures.

-- ─── Fin de migration BATCH D ─────────────────────────────────────────────────
