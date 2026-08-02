-- Migration: index manquants identifiés lors du diagnostic de lenteur
-- (Referral.referrerId, Tip.result, Report.status/reporterId/tipId,
-- User.role/isActive/createdAt) — 20260802140000
CREATE INDEX IF NOT EXISTS "referrals_referrerId_idx" ON "referrals"("referrerId");
CREATE INDEX IF NOT EXISTS "tips_result_idx" ON "tips"("result");
CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports"("status");
CREATE INDEX IF NOT EXISTS "reports_reporterId_idx" ON "reports"("reporterId");
CREATE INDEX IF NOT EXISTS "reports_tipId_idx" ON "reports"("tipId");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_isActive_idx" ON "users"("isActive");
CREATE INDEX IF NOT EXISTS "users_createdAt_idx" ON "users"("createdAt");
