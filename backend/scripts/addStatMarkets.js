// Ajoute aux pronostics DÉJÀ calculés des matchs à venir les marchés ajoutés
// depuis : cartons / tirs cadrés / fautes / hors-jeu, combinaisons (double
// chance + total, BTTS + total, mi-temps / fin de match…) et paris joueur
// (buteur, tir cadré).
//
// Aucune requête API-Football ni IA : n'utilise que les données déjà en base.
// Fusionne les nouveaux champs dans `predictions` sans toucher au reste
// (1X2, buts, corners...). Sans risque à relancer.
// Pour les paris joueur, lancer d'abord scripts/backfillPlayerStats.js.
//
// Usage (sur le serveur, dossier backend) :
//   node scripts/addStatMarkets.js        → matchs des 7 prochains jours
//   node scripts/addStatMarkets.js 14     → 14 prochains jours
require('dotenv').config();
const prisma = require('../src/config/database');
const { deriveStatMarkets } = require('../src/utils/statMarkets');
const { derivePlayerMarkets } = require('../src/utils/playerMarkets');
const { deriveComboMarkets, impliedTeamLambdas } = require('../src/services/predictionService');

const DAYS = parseInt(process.argv[2], 10) || 7;

async function lastMatches(teamName, excludeId) {
  return prisma.match.findMany({
    where: { OR: [{ homeTeam: teamName }, { awayTeam: teamName }], status: 'FINISHED', NOT: { id: excludeId } },
    orderBy: { scheduledAt: 'desc' },
    take: 10,
    select: { homeTeam: true, awayTeam: true, statistics: true },
  });
}

async function main() {
  const now = new Date();
  const until = new Date(now.getTime() + DAYS * 24 * 60 * 60 * 1000);
  const upcoming = await prisma.match.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { gte: now, lte: until } },
    select: { id: true, homeTeam: true, awayTeam: true, homeTeamId: true, awayTeamId: true, predictions: true },
  });

  let updated = 0;
  for (const m of upcoming) {
    if (!m.predictions || typeof m.predictions !== 'object') continue;
    const [home, away] = await Promise.all([lastMatches(m.homeTeam, m.id), lastMatches(m.awayTeam, m.id)]);
    const stats = deriveStatMarkets(m.homeTeam, m.awayTeam, home, away);
    const hasGoals = m.predictions.home != null && m.predictions.over25 != null;
    const combos = hasGoals ? deriveComboMarkets(m.predictions) : {};
    let players = {};
    if (hasGoals) {
      const { lambdaHome, lambdaAway } = impliedTeamLambdas(m.predictions);
      players = await derivePlayerMarkets(m, lambdaHome, lambdaAway);
    }
    const extra = { ...stats, ...combos, ...players };
    if (Object.keys(extra).length === 0) continue;
    await prisma.match.update({ where: { id: m.id }, data: { predictions: { ...m.predictions, ...extra } } });
    updated++;
  }
  console.log(`[addStatMarkets] ${upcoming.length} matchs à venir analysés, ${updated} enrichis (stats, combinaisons, joueurs).`);
}

main()
  .catch((err) => { console.error('[addStatMarkets] Erreur:', err.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
