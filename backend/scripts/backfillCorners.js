// Backfill ponctuel et borné : récupère les corners (via /fixtures/statistics)
// des matchs FINISHED récents qui n'en ont pas encore, pour amorcer plus vite
// l'historique utilisé par les marchés corners de predictionService.js.
//
// Contrairement à backfillHistoricalMatches.js (1 requête API par JOUR, toutes
// ligues confondues), ici c'est 1 requête API par MATCH — nettement plus
// coûteux en quota. D'où la limite --max stricte par défaut.
//
// Usage :
//   node scripts/backfillCorners.js                → 14 derniers jours, 80 matchs max (défaut)
//   node scripts/backfillCorners.js 30              → 30 derniers jours, 80 matchs max
//   node scripts/backfillCorners.js 30 200          → 30 derniers jours, 200 matchs max
//
// Coût : 1 requête API-Football par match traité. Plan gratuit = 100
// requêtes/jour partagées avec le reste de l'app (sync live, fiches match...) —
// ne pas dépasser ~60-80 par exécution pour laisser de la marge. Relancer le
// script les jours suivants pour couvrir le reste au fil du quota disponible
// (les matchs déjà traités, corners trouvés ou non, sont exclus des passages
// suivants — voir le filtre `homeCorners: null`).
require('dotenv').config();
const prisma = require('../src/config/database');
const { captureCornerStats } = require('../src/cron/syncMatches');

const DAYS = parseInt(process.argv[2], 10) || 14;
const MAX_MATCHES = parseInt(process.argv[3], 10) || 80;
const DELAY_MS = 1500; // même pause que backfillHistoricalMatches.js — reste correct vis-à-vis du quota

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const since = new Date();
  since.setDate(since.getDate() - DAYS);

  const matches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      scheduledAt: { gte: since },
      homeCorners: null, // pas encore de corners capturés pour ce match
    },
    orderBy: { scheduledAt: 'desc' },
    take: MAX_MATCHES,
    select: { id: true, externalId: true, homeTeam: true, awayTeam: true },
  });

  if (matches.length === 0) {
    console.log(`[BackfillCorners] Aucun match FINISHED sans corners sur les ${DAYS} derniers jours.`);
    process.exit(0);
  }

  console.log(`[BackfillCorners] ${matches.length} match(s) à traiter (max ${MAX_MATCHES}, ${DAYS}j) — ~${matches.length} requêtes API.`);

  let done = 0, withCorners = 0;
  for (const m of matches) {
    console.log(`[BackfillCorners] (${done + 1}/${matches.length}) ${m.homeTeam} vs ${m.awayTeam}...`);
    try {
      await captureCornerStats(m.id, m.externalId);
      const updated = await prisma.match.findUnique({ where: { id: m.id }, select: { homeCorners: true } });
      if (updated?.homeCorners != null) withCorners++;
      done++;
    } catch (err) {
      console.error(`[BackfillCorners] Erreur pour ${m.homeTeam} vs ${m.awayTeam} :`, err.message);
    }
    await sleep(DELAY_MS);
  }

  console.log(`[BackfillCorners] Terminé — ${done}/${matches.length} traités, ${withCorners} avec corners trouvés (l'API ne fournit pas toujours cette stat selon le championnat).`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[BackfillCorners] Erreur fatale :', err);
  process.exit(1);
});
