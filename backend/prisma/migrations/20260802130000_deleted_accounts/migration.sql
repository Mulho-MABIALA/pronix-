-- Migration: historique des comptes supprimés (self-service ou admin)
-- 20260802130000
CREATE TABLE IF NOT EXISTS "deleted_accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'self',
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deleted_accounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "deleted_accounts_deletedAt_idx" ON "deleted_accounts"("deletedAt");
