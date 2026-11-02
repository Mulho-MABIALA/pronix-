-- =============================================================================
-- Paris par joueur + mi-temps : score à la pause sur matches, et table des
-- stats joueurs par match (remplies en fin de match par cron/syncMatches.js,
-- même requête API que les stats d'équipe — aucun coût de quota en plus).
-- =============================================================================

ALTER TABLE "matches" ADD COLUMN "htHomeScore" INTEGER;
ALTER TABLE "matches" ADD COLUMN "htAwayScore" INTEGER;

CREATE TABLE "player_match_stats" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "position" TEXT,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "shots" INTEGER NOT NULL DEFAULT 0,
    "shotsOnTarget" INTEGER NOT NULL DEFAULT 0,
    "substitute" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "player_match_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "player_match_stats_matchId_playerId_key" ON "player_match_stats"("matchId", "playerId");
CREATE INDEX "player_match_stats_teamId_idx" ON "player_match_stats"("teamId");
CREATE INDEX "player_match_stats_playerId_idx" ON "player_match_stats"("playerId");

ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_matchId_fkey"
    FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
