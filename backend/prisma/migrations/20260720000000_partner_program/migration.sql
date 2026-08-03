-- =============================================================================
-- Programme Partenaires (influenceurs) — commission % sur abonnements générés
-- Convertie depuis migrations/partner_program.sql (appliquée manuellement via
-- psql) en vraie migration Prisma, idempotente (IF NOT EXISTS partout).
-- =============================================================================

CREATE TABLE IF NOT EXISTS "partners" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name"           TEXT NOT NULL,
  "code"           TEXT NOT NULL,
  "commissionRate" DOUBLE PRECISION NOT NULL,
  "contact"        TEXT,
  "active"         BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "partners_code_key" ON "partners"("code");

CREATE TABLE IF NOT EXISTS "partner_conversions" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "partnerId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_conversions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_conversions_userId_key" ON "partner_conversions"("userId");
CREATE INDEX IF NOT EXISTS "partner_conversions_partnerId_idx" ON "partner_conversions"("partnerId");

ALTER TABLE "partner_conversions"
  ADD CONSTRAINT "partner_conversions_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE;

ALTER TABLE "partner_conversions"
  ADD CONSTRAINT "partner_conversions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "partner_commissions" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "conversionId"     TEXT NOT NULL,
  "paymentId"        TEXT NOT NULL,
  "amount"           INTEGER NOT NULL,
  "commissionAmount" DOUBLE PRECISION NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'PENDING',
  "paidAt"           TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_commissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_commissions_paymentId_key" ON "partner_commissions"("paymentId");
CREATE INDEX IF NOT EXISTS "partner_commissions_conversionId_idx" ON "partner_commissions"("conversionId");

ALTER TABLE "partner_commissions"
  ADD CONSTRAINT "partner_commissions_conversionId_fkey"
  FOREIGN KEY ("conversionId") REFERENCES "partner_conversions"("id") ON DELETE CASCADE;

ALTER TABLE "partner_commissions"
  ADD CONSTRAINT "partner_commissions_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE;
