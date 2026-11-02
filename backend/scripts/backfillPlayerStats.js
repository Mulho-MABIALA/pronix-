// Rattrapage de l'historique joueurs (paris buteur / tir cadré) + mi-temps.
//
// Récupère, pour les matchs TERMINÉS récents qui n'ont pas encore de stats
// joueurs, le détail complet via /fixtures?ids= : 20 matchs par requête.
// 400 matchs = 20 requêtes seulement (quota gratuit : 100 requêtes/jour,
// partagées avec le reste de l'app — garder de la marge).
//
// Usage (sur le serveur, dossier backend) :
//   node scripts/backfillPlayerStats.js            → 21 derniers jours, 400 matchs max
//   node scripts/backfillPlayerStats.js 45 800     → 45 derniers jours, 800 matchs max
// Relançable sans risque : les matchs déjà traités sont ignorés.
require('dotenv').config();
const prisma = require('../src/config/database');
const footballApi = require('../src/services/footballApi');
const { saveFixtureDetails } = require('../src/cron/syncMatches');

const DAYS = parseInt(process.argv[2], 10) || 21;
const MAX_MATCHES = parseInt(process.argv[3], 10) || 400;
const BATCH = 20;
const DELAY_MS = 1500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const matches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      scheduledAt: { gte: since },
      playerStats: { none: {} },
      NOT: { externalId: { startsWith: 'mock' } },
    },
    orderBy: { scheduledAt: 'desc' },
    take: MAX_MATCHES,
    select: { id: true, externalId: true },
  });
  console.log(`[backfillPlayerStats] ${matches.length} matchs à compléter (${Math.ceil(matches.length / BATCH)} requêtes API)`);

  const byExternal = new Map(matches.map((m) => [String(m.externalId), m.id]));
  let saved = 0, players = 0;
  for (let i = 0; i < matches.length; i += BATCH) {
    const chunk = matches.slice(i, i + BATCH).map((m) => m.externalId);
    const fulls = await footballApi.getFixturesFullByIds(chunk);
    for (const full of fulls) {
      const d = footballApi.extractFixtureDetails(full);
      const matchId = d && byExternal.get(d.externalId);
      if (!matchId) continue;
      await saveFixtureDetails(matchId, d);
      saved++;
      players += d.players.length;
    }
    console.log(`  lot ${i / BATCH + 1} : ${fulls.length} matchs reçus`);
    await sleep(DELAY_MS);
  }
  console.log(`[backfillPlayerStats] Terminé : ${saved} matchs enregistrés, ${players} lignes joueurs.`);
}

main()
  .catch((err) => { console.error('[backfillPlayerStats] Erreur:', err.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
