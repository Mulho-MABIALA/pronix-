-- Migration: Admin activity notifications (cloche dashboard admin)
-- 20260731183000

CREATE TABLE IF NOT EXISTS "admin_notifications" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "type"      TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "message"   TEXT NOT NULL,
  "link"      TEXT,
  "isRead"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_notifications_isRead_idx"   ON "admin_notifications"("isRead");
CREATE INDEX IF NOT EXISTS "admin_notifications_createdAt_idx" ON "admin_notifications"("createdAt");
