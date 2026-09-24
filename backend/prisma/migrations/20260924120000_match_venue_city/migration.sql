-- =============================================================================
-- Ville du stade sur matches — utilisée pour la prévision météo au coup
-- d'envoi (services/weatherService.js). Nullable : remplie par le cron de
-- synchronisation (création + mise à jour quotidienne des matchs), pas de
-- backfill nécessaire (la météo ne concerne que les matchs à venir).
-- =============================================================================

ALTER TABLE "matches" ADD COLUMN "venueCity" TEXT;
