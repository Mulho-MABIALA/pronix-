// ─── Paris par joueur : buteur (à tout moment) et 1+ tir cadré ────────────────
// Données : table PlayerMatchStat (stats de chaque joueur, enregistrées en fin
// de match — cf. cron/syncMatches.js saveFixtureDetails).
//
// Pour chaque équipe, sur ses 10 derniers matchs avec données joueurs :
//  - temps de jeu attendu = fréquence de jeu × minutes moyennes
//  - buts / tirs cadrés par 90 min, « lissés » vers une moyenne prudente pour
//    ne pas surestimer un joueur qui a marqué une fois en 20 minutes
//  - les buts attendus des joueurs sont recalés pour que leur somme colle aux
//    buts attendus de l'équipe dans ce match (modèle de prédiction principal)
// Probabilité (loi de Poisson) : P(au moins 1) = 1 − e^(−attendu).
const prisma = require('../config/database');

const RECENT_MATCHES = 10;
const MIN_MATCHES = 3;          // matchs de l'équipe avec données joueurs
const PRIOR_WEIGHT_90 = 2;      // poids du lissage, en « matchs de 90 min »
// Valeurs de départ par poste (par 90 min) — un attaquant sans but sur 3
// matchs reste plus dangereux qu'un défenseur dans la même situation.
const PRIORS = {
  F: { goals: 0.35, sot: 0.9 },
  M: { goals: 0.12, sot: 0.4 },
  D: { goals: 0.05, sot: 0.15 },
  default: { goals: 0.12, sot: 0.35 },
};
const SOT_TO_GOAL = 0.3;        // ~30 % des tirs cadrés finissent au fond
const MAX_GOAL_PROB = 0.7;      // plafond prudent (même un grand buteur rate des matchs)
const TOP_PER_TEAM = 4;

const pct = (x) => Math.max(1, Math.min(95, Math.round(x * 100)));

async function teamPlayerProjections(teamId, teamLambda, excludeMatchId) {
  if (!teamId) return [];
  const recent = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      playerStats: { some: { teamId } },
      NOT: { id: excludeMatchId },
    },
    orderBy: { scheduledAt: 'desc' },
    take: RECENT_MATCHES,
    select: { id: true },
  });
  if (recent.length < MIN_MATCHES) return [];

  const order = new Map(recent.map((m, i) => [m.id, i])); // 0 = plus récent
  const rows = await prisma.playerMatchStat.findMany({
    where: { teamId, matchId: { in: recent.map((m) => m.id) } },
  });

  const players = new Map();
  for (const r of rows) {
    if (r.position === 'G') continue; // gardiens exclus
    const p = players.get(r.playerId) || { id: r.playerId, name: r.playerName, position: r.position, apps: 0, minutes: 0, goals: 0, sot: 0, lastIdx: 99 };
    if (r.position) p.position = r.position;
    if (r.minutes > 0) {
      p.apps++;
      p.minutes += r.minutes;
      p.goals += r.goals;
      p.sot += r.shotsOnTarget;
      p.lastIdx = Math.min(p.lastIdx, order.get(r.matchId) ?? 99);
    }
    p.name = r.playerName;
    players.set(r.playerId, p);
  }

  const n = recent.length;
  const projected = [];
  for (const p of players.values()) {
    // Joueur absent des 3 derniers matchs (blessé, transféré, écarté) : ignoré
    if (p.apps === 0 || p.lastIdx > 2) continue;
    const expMinutes = (p.apps / n) * (p.minutes / p.apps);
    const m90 = p.minutes / 90;
    const prior = PRIORS[p.position] || PRIORS.default;
    const sotP90 = (p.sot + prior.sot * PRIOR_WEIGHT_90) / (m90 + PRIOR_WEIGHT_90);
    const scoredP90 = (p.goals + prior.goals * PRIOR_WEIGHT_90) / (m90 + PRIOR_WEIGHT_90);
    // Moitié buts réellement marqués, moitié « buts que ses tirs cadrés
    // laissent espérer » : plus stable sur peu de matchs.
    const goalsP90 = 0.5 * scoredP90 + 0.5 * sotP90 * SOT_TO_GOAL;
    projected.push({ ...p, lambdaGoal: goalsP90 * (expMinutes / 90), lambdaSot: sotP90 * (expMinutes / 90) });
  }
  if (projected.length === 0) return [];

  // Recalage : la somme des buts attendus des joueurs ≈ buts attendus de
  // l'équipe (95 % — le reste : c.s.c., joueurs sans historique).
  const sum = projected.reduce((s, p) => s + p.lambdaGoal, 0) || 1;
  const scale = Math.max(0.5, Math.min(2, (teamLambda * 0.95) / sum));

  return projected
    .map((p) => ({
      id: p.id,
      name: p.name,
      goal: pct(Math.min(MAX_GOAL_PROB, 1 - Math.exp(-p.lambdaGoal * scale))),
      sot: pct(1 - Math.exp(-p.lambdaSot)),
    }))
    .sort((a, b) => b.goal - a.goal)
    .slice(0, TOP_PER_TEAM);
}

/**
 * Marchés joueurs d'un match à venir.
 * @param {Object} match — { id, homeTeamId, awayTeamId }
 * @param {number} lambdaHome / lambdaAway — buts attendus de chaque équipe
 * @returns {Promise<Object>} { players: [...], hasPlayerData: true } ou {}
 */
async function derivePlayerMarkets(match, lambdaHome, lambdaAway) {
  try {
    const [home, away] = await Promise.all([
      teamPlayerProjections(match.homeTeamId, lambdaHome, match.id),
      teamPlayerProjections(match.awayTeamId, lambdaAway, match.id),
    ]);
    const players = [
      ...home.map((p) => ({ ...p, side: 'home' })),
      ...away.map((p) => ({ ...p, side: 'away' })),
    ].sort((a, b) => b.goal - a.goal);
    if (players.length === 0) return {};
    return { players, hasPlayerData: true };
  } catch (err) {
    console.error('[PlayerMarkets] Erreur:', err.message);
    return {};
  }
}

// ── Codage des paris joueur dans un ticket : "scorer:<idJoueur>:<nom>" ou
// "psot:<idJoueur>:<nom>" (le nom sert seulement à l'affichage).
function parsePlayerPick(type) {
  const m = /^(scorer|psot):([^:]+):(.*)$/.exec(type || '');
  return m ? { kind: m[1], playerId: m[2], name: m[3] } : null;
}

// Résultat une fois le match terminé — playerStats : lignes PlayerMatchStat
// du match. null si pas un pari joueur ou si les stats joueurs manquent.
// Joueur qui n'a pas joué : 'VOID' (remboursé, règle habituelle des books).
function resolvePlayerPick(type, playerStats) {
  const p = parsePlayerPick(type);
  if (!p || !Array.isArray(playerStats) || playerStats.length === 0) return null;
  const row = playerStats.find((r) => String(r.playerId) === p.playerId);
  if (!row || row.minutes === 0) return 'VOID';
  if (p.kind === 'scorer') return row.goals > 0 ? 'WIN' : 'LOSS';
  return row.shotsOnTarget > 0 ? 'WIN' : 'LOSS';
}

module.exports = { derivePlayerMarkets, parsePlayerPick, resolvePlayerPick };
