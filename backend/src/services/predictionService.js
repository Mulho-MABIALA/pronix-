// Service de calcul des probabilités 1X2, Over/Under, BTTS
// Algorithme probabiliste basé sur la forme récente des équipes (10 derniers matchs)
const prisma = require('../config/database');

const HOME_ADV = 0.10; // avantage domicile

function getTeamStats(matches, teamName) {
  const played = matches.filter((m) => m.homeScore !== null && m.awayScore !== null);
  if (!played.length) return null;

  let wins = 0, draws = 0, losses = 0;
  let totalGoals = 0, btts = 0, over25 = 0, over15 = 0;

  for (const m of played) {
    const isHome = m.homeTeam === teamName;
    const gFor     = isHome ? m.homeScore : m.awayScore;
    const gAgainst = isHome ? m.awayScore : m.homeScore;
    const total    = gFor + gAgainst;

    totalGoals += total;
    if (total > 2.5) over25++;
    if (total > 1.5) over15++;
    if (gFor > 0 && gAgainst > 0) btts++;

    if (gFor > gAgainst) wins++;
    else if (gFor === gAgainst) draws++;
    else losses++;
  }

  const n = played.length;
  return {
    winRate:   wins   / n,
    drawRate:  draws  / n,
    lossRate:  losses / n,
    avgGoals:  totalGoals / n,
    bttsRate:  btts   / n,
    over25Rate: over25 / n,
    over15Rate: over15 / n,
    sampleSize: n,
  };
}

async function calculateMatchPredictions(match) {
  const fields = {
    select: {
      homeTeam: true, awayTeam: true,
      homeScore: true, awayScore: true,
    },
  };

  const [homeMatches, awayMatches] = await Promise.all([
    prisma.match.findMany({
      where: { OR: [{ homeTeam: match.homeTeam }, { awayTeam: match.homeTeam }], status: 'FINISHED', NOT: { id: match.id } },
      orderBy: { scheduledAt: 'desc' },
      take: 10,
      ...fields,
    }),
    prisma.match.findMany({
      where: { OR: [{ homeTeam: match.awayTeam }, { awayTeam: match.awayTeam }], status: 'FINISHED', NOT: { id: match.id } },
      orderBy: { scheduledAt: 'desc' },
      take: 10,
      ...fields,
    }),
  ]);

  const hs = getTeamStats(homeMatches, match.homeTeam);
  const as = getTeamStats(awayMatches, match.awayTeam);

  if (!hs || !as || hs.sampleSize < 3 || as.sampleSize < 3) return null;

  // ── 1X2 avec avantage domicile ──────────────────────────────────
  const hStr = hs.winRate * (1 + HOME_ADV) + as.lossRate;
  const aStr = as.winRate * (1 - HOME_ADV * 0.5) + hs.lossRate;
  const dStr = (hs.drawRate + as.drawRate) * 1.1;
  const total = hStr + dStr + aStr || 1;

  const home = Math.max(1, Math.round((hStr / total) * 100));
  const draw = Math.max(1, Math.round((dStr / total) * 100));
  const away = Math.max(1, 100 - home - draw);

  // ── Over/Under & BTTS ──────────────────────────────────────────
  const over25 = Math.min(95, Math.round(((hs.over25Rate + as.over25Rate) / 2) * 100));
  const over15 = Math.min(98, Math.round(((hs.over15Rate + as.over15Rate) / 2) * 100));
  const btts   = Math.min(95, Math.round(((hs.bttsRate   + as.bttsRate)   / 2) * 100));

  // ── Double chance ──────────────────────────────────────────────
  const dc1x = Math.min(99, home + draw);
  const dc2x = Math.min(99, away + draw);

  // ── Meilleur pick (probabilité la plus élevée) ─────────────────
  const candidates = [
    { type: '1',      label: 'Victoire domicile',      prob: home,   market: '1X2' },
    { type: 'X',      label: 'Match nul',               prob: draw,   market: '1X2' },
    { type: '2',      label: 'Victoire extérieur',      prob: away,   market: '1X2' },
    { type: 'over25', label: 'Plus de 2.5 buts',        prob: over25, market: 'Over/Under' },
    { type: 'over15', label: 'Plus de 1.5 buts',        prob: over15, market: 'Over/Under' },
    { type: 'btts',   label: 'Les 2 équipes marquent',  prob: btts,   market: 'BTTS' },
    { type: '1X',     label: 'Double chance 1X',        prob: dc1x,   market: 'Double chance' },
    { type: 'X2',     label: 'Double chance X2',        prob: dc2x,   market: 'Double chance' },
  ].sort((a, b) => b.prob - a.prob);

  const bestPick = candidates[0];
  const confidence = bestPick.prob >= 72 ? 'high' : bestPick.prob >= 58 ? 'medium' : 'low';

  return {
    home, draw, away,
    over25, over15, under25: 100 - over25, under15: 100 - over15,
    btts, nobtts: 100 - btts,
    dc1x, dc2x,
    bestPick,
    confidence,
    allPicks: candidates.slice(0, 5),
    sampleSize: Math.min(hs.sampleSize, as.sampleSize),
  };
}

async function calculateAndSavePredictions(matchId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, homeTeam: true, awayTeam: true, status: true },
  });
  if (!match) return null;

  const predictions = await calculateMatchPredictions(match);
  if (!predictions) return null;

  await prisma.match.update({ where: { id: matchId }, data: { predictions } });
  return predictions;
}

async function calculatePredictionsForDate(dateStr) {
  const d     = new Date(dateStr);
  const dNext = new Date(dateStr);
  dNext.setDate(dNext.getDate() + 1);

  const matches = await prisma.match.findMany({
    where: {
      scheduledAt: { gte: d, lt: dNext },
      status: 'SCHEDULED',
      predictions: null,
    },
    select: { id: true },
  });

  console.log(`[Predictions] Calcul pour ${matches.length} matchs du ${dateStr}`);
  for (const { id } of matches) {
    await calculateAndSavePredictions(id).catch((e) =>
      console.error(`[Predictions] Erreur match ${id}:`, e.message)
    );
  }
  return matches.length;
}

module.exports = { calculateMatchPredictions, calculateAndSavePredictions, calculatePredictionsForDate };
