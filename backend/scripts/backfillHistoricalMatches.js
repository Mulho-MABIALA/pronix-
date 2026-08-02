// Backfill ponctuel : récupère les matchs + résultats des N derniers jours
// via API-Football et les enregistre en base (même logique que la synchro
// quotidienne dans cron/syncMatches.js — upsert par externalId, donc sans
// risque de doublons si un jour a déjà été synchronisé par le cron normal).
//
// But : enrichir l'historique dispo pour les stats équipes/H2H/formes
// utilisées par le générateur de pronostics et les fiches match.
//
// Usage :
//   node scripts/backfillHistoricalMatches.js        → 30 derniers jours (défaut)
//   node scripts/backfillHistoricalMatches.js 90      → 90 derniers jours
//
// Coût : 1 requête API-Football par jour interrogé (endpoint /fixtures?date=,
// couvre toutes les ligues du monde en un seul appel). Le plan gratuit est
// limité à 100 requêtes/jour — même quota que la synchro live/quotidienne —
// donc ne pas lancer un backfill de plus de ~70-80 jours en une seule fois
// pour laisser de la marge au reste de l'app ce jour-là.
require('dotenv').config();
const { syncMatchesForDate } = require('../src/cron/syncMatches');

const DAYS = parseInt(process.argv[2], 10) || 30;
const DELAY_MS = 1500; // pause entre deux appels API — reste correct vis-à-vis du quota

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log(`[Backfill] Récupération des ${DAYS} derniers jours de matchs...`);
  const today = new Date();
  let totalDays = 0;

  for (let i = 1; i <= DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    console.log(`[Backfill] (${i}/${DAYS}) ${dateStr}...`);
    try {
      await syncMatchesForDate(dateStr);
      totalDays++;
    } catch (err) {
      console.error(`[Backfill] Erreur pour ${dateStr} :`, err.message);
    }
    await sleep(DELAY_MS);
  }

  console.log(`[Backfill] Terminé — ${totalDays}/${DAYS} jours traités.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[Backfill] Erreur fatale :', err);
  process.exit(1);
});
