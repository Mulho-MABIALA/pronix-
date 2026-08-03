-- Migration: table partagée pour les challenges de connexion passkey
-- (nécessaire en cluster PM2 — un Map en mémoire ne suffit pas) — 20260803110000

CREATE TABLE IF NOT EXISTS "webauthn_challenges" (
    "id" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "webauthn_challenges_expiresAt_idx" ON "webauthn_challenges"("expiresAt");
