-- =============================================================================
-- Journal d'audit admin — traçabilité des actions sensibles (suspension,
-- suppression, activation manuelle d'abonnement, remboursement, etc.)
-- =============================================================================

CREATE TABLE "admin_audit_logs" (
    "id"         TEXT NOT NULL,
    "adminId"    TEXT,
    "adminEmail" TEXT NOT NULL,
    "action"     TEXT NOT NULL,
    "targetType" TEXT,
    "targetId"   TEXT,
    "details"    TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_adminId_idx" ON "admin_audit_logs"("adminId");
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

ALTER TABLE "admin_audit_logs"
  ADD CONSTRAINT "admin_audit_logs_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
