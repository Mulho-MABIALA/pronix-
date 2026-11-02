-- =============================================================================
-- Réglages globaux (clé/valeur) — utilisé par le mode maintenance piloté
-- depuis l'admin (services/maintenanceService.js).
-- =============================================================================

CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);
