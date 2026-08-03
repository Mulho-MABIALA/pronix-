-- =============================================================================
-- Corners par match — colonnes homeCorners/awayCorners sur matches, remplies
-- à la bascule LIVE→FINISHED (voir cron/syncMatches.js). Nullable : pas de
-- backfill rétroactif en masse (coûterait 1 requête API par match historique,
-- hors budget du plan gratuit) — l'historique se constitue au fil des matchs
-- qui se terminent après ce déploiement, plus un backfill borné optionnel
-- (scripts/backfillCorners.js) pour les matchs récents.
-- =============================================================================

ALTER TABLE "matches" ADD COLUMN "homeCorners" INTEGER;
ALTER TABLE "matches" ADD COLUMN "awayCorners" INTEGER;
