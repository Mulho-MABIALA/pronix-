// ─────────────────────────────────────────────────────────────────────────────
// Nettoyage ponctuel : relie a posteriori les BetEntry historiques (créées
// avant que matchId ne devienne obligatoire, cf. tâche #265) à un vrai Match
// quand c'est possible, pour qu'ils affichent les vrais logos d'équipe au
// lieu du fallback "initiales" (déjà géré gracieusement côté frontend
// depuis le fix BetTracker.jsx — ce script est un bonus de propreté des
// données, PAS un correctif de bug utilisateur).
//
// Ne supprime et n'écrase jamais rien : matche uniquement par nom d'équipe
// (insensible à la casse/accents) + date du match à ±1 jour, et ne touche
// que les entrées où matchId est encore null. Les entrées sans correspondance
// fiable restent telles quelles (le fallback UI s'en occupe).
//
// Usage :
//   node scripts/cleanupLegacyBetEntries.js          → dry-run (affiche sans écrire)
//   node scripts/cleanupLegacyBetEntries.js --apply   → applique réellement les liaisons
require('dotenv').config();
const prisma = require('../src/config/database');

const APPLY = process.argv.includes('--apply');

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-z0-9]/g, ''); // retire espaces/ponctuation
}

async function run() {
  const orphans = await prisma.betEntry.findMany({
    where: { matchId: null },
    select: { id: true, teamA: true, teamB: true, matchDate: true },
  });

  console.log(`[Cleanup] ${orphans.length} entrée(s) sans match lié trouvée(s).`);
  if (orphans.length === 0) return;

  let linked = 0;
  let unmatched = 0;

  for (const bet of orphans) {
    const dayStart = new Date(bet.matchDate);
    dayStart.setDate(dayStart.getDate() - 1);
    const dayEnd = new Date(bet.matchDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const candidates = await prisma.match.findMany({
      where: { scheduledAt: { gte: dayStart, lte: dayEnd } },
      select: { id: true, homeTeam: true, awayTeam: true, scheduledAt: true },
    });

    const nA = normalize(bet.teamA);
    const nB = normalize(bet.teamB);

    const match = candidates.find((m) => {
      const h = normalize(m.homeTeam);
      const a = normalize(m.awayTeam);
      return (h === nA && a === nB) || (h === nB && a === nA);
    });

    if (match) {
      linked++;
      console.log(`[Cleanup] ✅ "${bet.teamA} vs ${bet.teamB}" (${bet.matchDate.toISOString().slice(0, 10)}) → match ${match.id}`);
      if (APPLY) {
        await prisma.betEntry.update({ where: { id: bet.id }, data: { matchId: match.id } });
      }
    } else {
      unmatched++;
    }
  }

  console.log(`\n[Cleanup] Résumé : ${linked} liaison(s) ${APPLY ? 'appliquée(s)' : 'trouvée(s) (dry-run)'}, ${unmatched} sans correspondance fiable (laissées telles quelles).`);
  if (!APPLY && linked > 0) {
    console.log('[Cleanup] Relancez avec --apply pour écrire ces liaisons en base.');
  }
}

run()
  .catch((err) => { console.error('[Cleanup] Erreur:', err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
