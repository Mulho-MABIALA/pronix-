// Service de calcul des probabilités 1X2, Over/Under, BTTS
// Algorithme probabiliste basé sur la forme récente des équipes (10 derniers matchs)
// Fallback 2 : Claude IA quand données insuffisantes (< 3 matchs d'historique)
const prisma = require('../config/database');
const { Prisma } = require('@prisma/client');
const { generateAIPrediction } = require('./aiPredictionService');
const { getMatchContext } = require('./footballContextService');

const HOME_ADV = 0.10; // avantage domicile

function getTeamStats(matches, teamName) {
  const played = matches.filter((m) => m.homeScore !== null && m.awayScore !== null);
  if (!played.length) return null;

  let wins = 0, draws = 0, losses = 0;
  let totalGoals = 0, btts = 0, over25 = 0, over15 = 0, over35 = 0;
  // Corners : capturés depuis 20260803140000_match_corners, uniquement pour les
  // matchs terminés après ce déploiement — donc souvent null sur l'historique.
  // On moyenne seulement sur les matchs où la donnée existe (cornerMatches),
  // pas sur tout l'échantillon, sous peine de biaiser vers 0.
  let cornersFor = 0, cornersAgainst = 0, cornerMatches = 0;

  for (const m of played) {
    const isHome = m.homeTeam === teamName;
    const gFor     = isHome ? m.homeScore : m.awayScore;
    const gAgainst = isHome ? m.awayScore : m.homeScore;
    const total    = gFor + gAgainst;

    totalGoals += total;
    if (total > 3.5) over35++;
    if (total > 2.5) over25++;
    if (total > 1.5) over15++;
    if (gFor > 0 && gAgainst > 0) btts++;

    if (gFor > gAgainst) wins++;
    else if (gFor === gAgainst) draws++;
    else losses++;

    const cFor     = isHome ? m.homeCorners : m.awayCorners;
    const cAgainst = isHome ? m.awayCorners : m.homeCorners;
    if (cFor != null && cAgainst != null) {
      cornersFor     += cFor;
      cornersAgainst += cAgainst;
      cornerMatches++;
    }
  }

  const n = played.length;
  return {
    winRate:   wins   / n,
    drawRate:  draws  / n,
    lossRate:  losses / n,
    avgGoals:  totalGoals / n,
    bttsRate:   btts   / n,
    over35Rate: over35 / n,
    over25Rate: over25 / n,
    over15Rate: over15 / n,
    sampleSize: n,
    avgCornersFor:     cornerMatches ? cornersFor     / cornerMatches : null,
    avgCornersAgainst: cornerMatches ? cornersAgainst / cornerMatches : null,
    cornerSampleSize:  cornerMatches,
  };
}

// ── Distribution de Poisson ────────────────────────────────────────────────────
function poisson(lambda, k) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

/**
 * Retourne les 6 scorelines les plus probables.
 * @param {number} lambdaHome — buts attendus domicile
 * @param {number} lambdaAway — buts attendus extérieur
 * @returns {Array} [{ score: '2-1', prob: 18, homeGoals: 2, awayGoals: 1 }, …]
 */
function calculateScorelines(lambdaHome, lambdaAway) {
  const lH = Math.max(0.3, Math.min(4, lambdaHome));
  const lA = Math.max(0.3, Math.min(4, lambdaAway));
  const results = [];

  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const prob = poisson(lH, h) * poisson(lA, a);
      results.push({ score: `${h}-${a}`, prob: Math.round(prob * 100), homeGoals: h, awayGoals: a });
    }
  }

  return results
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 6);
}

// ── Marchés corners ────────────────────────────────────────────────────────
// Contrairement aux marchés buts (dérivés du même modèle 1X2/Over pour toutes
// les sources), les corners n'ont pas d'équivalent "implicite" — ils dépendent
// de la moyenne de corners réellement produits/concédés par chaque équipe,
// disponible uniquement via calculateMatchPredictions (jamais pour l'IA ou le
// fallback neutre, qui n'ont de toute façon pas assez d'historique de buts
// pour espérer avoir assez d'historique de corners non plus).
function deriveCornerMarkets(lambdaHomeCorners, lambdaAwayCorners) {
  const lH = Math.max(1, Math.min(12, lambdaHomeCorners));
  const lA = Math.max(1, Math.min(12, lambdaAwayCorners));
  const MAXC = 18;

  let corner1 = 0, cornerX = 0, corner2 = 0;
  let over75 = 0, over85 = 0, over95 = 0, over105 = 0;
  let handHome25 = 0, handAway25 = 0; // "handicap -2.5 corners" : 3 corners d'écart ou plus

  for (let h = 0; h <= MAXC; h++) {
    for (let a = 0; a <= MAXC; a++) {
      const p = poisson(lH, h) * poisson(lA, a);
      const totalC = h + a;

      if (h > a) corner1 += p;
      else if (h === a) cornerX += p;
      else corner2 += p;

      if (totalC > 7.5)  over75  += p;
      if (totalC > 8.5)  over85  += p;
      if (totalC > 9.5)  over95  += p;
      if (totalC > 10.5) over105 += p;

      if (h - a >= 3) handHome25 += p;
      if (a - h >= 3) handAway25 += p;
    }
  }

  const pct = (x) => Math.max(1, Math.min(98, Math.round(x * 100)));

  return {
    corner1: pct(corner1), cornerX: pct(cornerX), corner2: pct(corner2),
    cornerOver75:  pct(over75),  cornerUnder75:  pct(1 - over75),
    cornerOver85:  pct(over85),  cornerUnder85:  pct(1 - over85),
    cornerOver95:  pct(over95),  cornerUnder95:  pct(1 - over95),
    cornerOver105: pct(over105), cornerUnder105: pct(1 - over105),
    cornerHandHome25: pct(handHome25),
    cornerHandAway25: pct(handAway25),
    avgCornersExpected: Math.round((lH + lA) * 10) / 10,
    hasCornerData: true,
  };
}

async function calculateMatchPredictions(match) {
  const fields = {
    select: {
      homeTeam: true, awayTeam: true,
      homeScore: true, awayScore: true,
      homeCorners: true, awayCorners: true,
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
  const over35 = Math.min(85, Math.round(((hs.over35Rate + as.over35Rate) / 2) * 100));
  const over25 = Math.min(95, Math.round(((hs.over25Rate + as.over25Rate) / 2) * 100));
  const over15 = Math.min(98, Math.round(((hs.over15Rate + as.over15Rate) / 2) * 100));
  const btts   = Math.min(95, Math.round(((hs.bttsRate   + as.bttsRate)   / 2) * 100));

  // ── Double chance ──────────────────────────────────────────────
  const dc1x = Math.min(99, home + draw);
  const dc2x = Math.min(99, away + draw);
  const dc12 = Math.min(99, home + away); // 12 : pas de nul

  // ── Scénarios de score (distribution de Poisson) ──────────────
  const scorelines = calculateScorelines(hs.avgGoals * (1 + HOME_ADV), as.avgGoals * (1 - HOME_ADV * 0.5));

  // ── Meilleur pick (probabilité la plus élevée) ─────────────────
  const candidates = [
    { type: '1',       label: 'Victoire domicile',           prob: home,    market: '1X2' },
    { type: 'X',       label: 'Match nul',                    prob: draw,    market: '1X2' },
    { type: '2',       label: 'Victoire extérieur',           prob: away,    market: '1X2' },
    { type: 'over25',  label: 'Plus de 2.5 buts',             prob: over25,  market: 'Over/Under' },
    { type: 'over15',  label: 'Plus de 1.5 buts',             prob: over15,  market: 'Over/Under' },
    { type: 'btts',    label: 'Les 2 équipes marquent',       prob: btts,    market: 'BTTS' },
    { type: '1X',      label: 'Double chance 1X',             prob: dc1x,    market: 'Double chance' },
    { type: 'X2',      label: 'Double chance X2',             prob: dc2x,    market: 'Double chance' },
    { type: '12',      label: 'Double chance 12 (sans nul)',  prob: dc12,    market: 'Double chance' },
    { type: 'under25', label: 'Moins de 2.5 buts',            prob: 100 - over25, market: 'Over/Under' },
    { type: 'nobtts',  label: 'Les 2 équipes ne marquent pas', prob: 100 - btts,  market: 'BTTS' },
    { type: 'over35',  label: 'Plus de 3.5 buts',             prob: over35,  market: 'Over/Under' },
  ].sort((a, b) => b.prob - a.prob);

  const bestPick = candidates[0];
  const confidence = bestPick.prob >= 72 ? 'high' : bestPick.prob >= 58 ? 'medium' : 'low';

  // ── Marchés corners — uniquement si les 2 équipes ont assez de matchs avec
  // données corners disponibles (voir getTeamStats). Sinon absent du résultat :
  // le frontend affiche un repli neutre tant que l'historique ne s'est pas
  // constitué (voir Machine.jsx getProb()).
  let cornerMarkets = null;
  if (hs.cornerSampleSize >= 3 && as.cornerSampleSize >= 3) {
    const lambdaHomeCorners = (hs.avgCornersFor + as.avgCornersAgainst) / 2;
    const lambdaAwayCorners = (as.avgCornersFor + hs.avgCornersAgainst) / 2;
    cornerMarkets = deriveCornerMarkets(lambdaHomeCorners, lambdaAwayCorners);
  }

  return {
    home, draw, away,
    over35, under35: 100 - over35,
    over25, over15, under25: 100 - over25, under15: 100 - over15,
    btts, nobtts: 100 - btts,
    dc1x, dc2x, dc12,
    bestPick,
    confidence,
    allPicks: candidates.slice(0, 5),
    sampleSize: Math.min(hs.sampleSize, as.sampleSize),
    scorelines,
    ...(cornerMarkets || {}),
  };
}

// Pronostic neutre quand pas assez de données historiques
function generateFallbackPrediction() {
  const homeAdv = Math.round(Math.random() * 10 - 5); // légère variation
  const home    = Math.max(25, Math.min(50, 35 + homeAdv));
  const away    = Math.max(25, Math.min(50, 33 - homeAdv));
  const draw    = 100 - home - away;
  const over35  = Math.round(20 + Math.random() * 10);
  const over25  = Math.round(50 + Math.random() * 10);
  const over15  = Math.round(70 + Math.random() * 8);
  const btts    = Math.round(45 + Math.random() * 10);
  const dc1x    = Math.min(99, home + draw);
  const dc2x    = Math.min(99, away + draw);
  const dc12    = Math.min(99, home + away);

  const candidates = [
    { type: '1',       label: 'Victoire domicile',           prob: home,          market: '1X2' },
    { type: 'X',       label: 'Match nul',                    prob: draw,          market: '1X2' },
    { type: '2',       label: 'Victoire extérieur',           prob: away,          market: '1X2' },
    { type: 'over25',  label: 'Plus de 2.5 buts',             prob: over25,        market: 'Over/Under' },
    { type: 'over15',  label: 'Plus de 1.5 buts',             prob: over15,        market: 'Over/Under' },
    { type: 'btts',    label: 'Les 2 équipes marquent',       prob: btts,          market: 'BTTS' },
    { type: '1X',      label: 'Double chance 1X',             prob: dc1x,          market: 'Double chance' },
    { type: 'X2',      label: 'Double chance X2',             prob: dc2x,          market: 'Double chance' },
    { type: '12',      label: 'Double chance 12 (sans nul)',  prob: dc12,          market: 'Double chance' },
    { type: 'under25', label: 'Moins de 2.5 buts',            prob: 100 - over25,  market: 'Over/Under' },
    { type: 'nobtts',  label: 'Les 2 équipes ne marquent pas', prob: 100 - btts,   market: 'BTTS' },
    { type: 'over35',  label: 'Plus de 3.5 buts',             prob: over35,        market: 'Over/Under' },
  ].sort((a, b) => b.prob - a.prob);

  return {
    home, draw, away,
    over35, under35: 100 - over35,
    over25, over15, under25: 100 - over25, under15: 100 - over15,
    btts, nobtts: 100 - btts,
    dc1x, dc2x, dc12,
    bestPick:   candidates[0],
    confidence: 'low',
    allPicks:   candidates.slice(0, 5),
    sampleSize: 0,
  };
}

// ── Marchés 1ère mi-temps (HT) — dérivés du modèle Poisson plein temps ────────
// En football professionnel, la 1ère mi-temps compte statistiquement environ
// 44% des buts totaux d'un match (2ème mi-temps plus prolifique : fatigue
// défensive, changements tactiques, enjeux qui se précisent). On applique ce
// ratio aux buts attendus (lambda) du plein temps — retrouvés par recherche
// dichotomique à partir de la probabilité "Over 2.5" déjà calculée — pour
// obtenir des marchés mi-temps cohérents avec le modèle déjà utilisé pour les
// scénarios de score (Poisson). Fonctionne pour les 3 sources de pronostics
// (stats, IA, fallback neutre) puisqu'elles exposent toutes home/draw/away/over25.
const HT_GOAL_SHARE = 0.44;

// Retrouve le lambda total (buts attendus, plein temps) le plus cohérent avec
// une probabilité "Over 2.5" donnée, par recherche dichotomique sur Poisson.
function impliedTotalLambda(over25Pct) {
  const target = Math.max(0.02, Math.min(0.98, (over25Pct ?? 50) / 100));
  let lo = 0.3, hi = 6;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const pOver = 1 - poisson(mid, 0) - poisson(mid, 1) - poisson(mid, 2);
    if (pOver > target) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

function deriveHalfTimeMarkets(pred) {
  const home = pred.home ?? 33, draw = pred.draw ?? 34, away = pred.away ?? 33;
  const lambdaTotal = impliedTotalLambda(pred.over25);

  // Répartit le lambda total entre les 2 équipes selon leurs chances de victoire
  const lambdaHome = lambdaTotal * ((home + draw / 2) / 100);
  const lambdaAway = lambdaTotal * ((away + draw / 2) / 100);

  const lH = Math.max(0.15, lambdaHome * HT_GOAL_SHARE);
  const lA = Math.max(0.15, lambdaAway * HT_GOAL_SHARE);

  let htHomeP = 0, htDrawP = 0, htAwayP = 0;
  const htScorelines = [];
  for (let h = 0; h <= 4; h++) {
    for (let a = 0; a <= 4; a++) {
      const p = poisson(lH, h) * poisson(lA, a);
      if (h > a) htHomeP += p;
      else if (h === a) htDrawP += p;
      else htAwayP += p;
      htScorelines.push({ score: `${h}-${a}`, prob: Math.round(p * 100), homeGoals: h, awayGoals: a });
    }
  }

  const htTotalP = htHomeP + htDrawP + htAwayP || 1;
  const htHome = Math.round((htHomeP / htTotalP) * 100);
  const htDraw = Math.round((htDrawP / htTotalP) * 100);
  const htAway = Math.max(0, 100 - htHome - htDraw);

  const lambdaTotalHT = lH + lA;
  const htOver15 = Math.max(2, Math.min(90, Math.round((1 - poisson(lambdaTotalHT, 0) - poisson(lambdaTotalHT, 1)) * 100)));

  const htTopScorelines = htScorelines.sort((a, b) => b.prob - a.prob).slice(0, 3);

  return {
    htHome, htDraw, htAway,
    htOver15, htUnder15: 100 - htOver15,
    htBestScore: htTopScorelines[0]?.score ?? '0-0',
    htScorelines: htTopScorelines,
  };
}

// ── Marchés buts avancés (handicap, multi-buts, score exact, combos) ──────────
// Inspirés des marchés 1xbet demandés par l'équipe produit : handicap européen,
// équipe marque 2+ buts, gagne sans encaisser, score exact, résultat+total,
// résultat+BTTS, double chance+BTTS, total pair/impair. Même principe que
// deriveHalfTimeMarkets ci-dessus : lambda implicite retrouvé depuis Over 2.5,
// réparti entre les 2 équipes selon home/draw/away, puis grille de Poisson
// complète (pas seulement le top 6 comme "scorelines") pour sommer les zones
// de probabilité pertinentes. Fonctionne pour les 3 sources de pronostics
// (stats, IA, fallback neutre) puisqu'elles exposent toutes home/draw/away/over25.
function deriveGoalMarkets(pred) {
  const home = pred.home ?? 33, draw = pred.draw ?? 34, away = pred.away ?? 33;
  const lambdaTotal = impliedTotalLambda(pred.over25);
  const lambdaHome = Math.max(0.2, lambdaTotal * ((home + draw / 2) / 100));
  const lambdaAway = Math.max(0.2, lambdaTotal * ((away + draw / 2) / 100));

  const MAXG = 7;
  let exact = { score: '0-0', prob: 0 };
  let h1m1 = 0, h2m1 = 0;           // victoire avec 2 buts d'écart ou plus (handicap -1)
  let mb1 = 0, mb2 = 0;             // équipe marque 2 buts ou plus
  let cs1 = 0, cs2 = 0;             // gagne sans encaisser (clean sheet + victoire)
  let pairTotal = 0;                // total de buts pair (0, 2, 4...)
  let res1o25 = 0, res1u25 = 0, resXo25 = 0, resXu25 = 0, res2o25 = 0, res2u25 = 0;
  let res1btts = 0, resXbtts = 0, res2btts = 0;

  for (let h = 0; h <= MAXG; h++) {
    for (let a = 0; a <= MAXG; a++) {
      const p = poisson(lambdaHome, h) * poisson(lambdaAway, a);
      if (p > exact.prob) exact = { score: `${h}-${a}`, prob: p };

      if (h - a >= 2) h1m1 += p;
      if (a - h >= 2) h2m1 += p;
      if (h >= 2) mb1 += p;
      if (a >= 2) mb2 += p;
      if (h > a && a === 0) cs1 += p;
      if (a > h && h === 0) cs2 += p;
      if ((h + a) % 2 === 0) pairTotal += p;

      const isOver25 = (h + a) > 2.5;
      const isBtts = h > 0 && a > 0;
      if (h > a) {
        if (isOver25) res1o25 += p; else res1u25 += p;
        if (isBtts) res1btts += p;
      } else if (h === a) {
        if (isOver25) resXo25 += p; else resXu25 += p;
        if (isBtts) resXbtts += p;
      } else {
        if (isOver25) res2o25 += p; else res2u25 += p;
        if (isBtts) res2btts += p;
      }
    }
  }

  const pct = (x) => Math.max(1, Math.min(98, Math.round(x * 100)));

  return {
    exactScore: exact.score,
    exactScoreProb: pct(exact.prob),
    h1m1: pct(h1m1), h2m1: pct(h2m1),
    mb1_2plus: pct(mb1), mb2_2plus: pct(mb2),
    cleansheet1: pct(cs1), cleansheet2: pct(cs2),
    totalpair: pct(pairTotal), totalimpair: pct(1 - pairTotal),
    res1over25: pct(res1o25), res1under25: pct(res1u25),
    resXover25: pct(resXo25), resXunder25: pct(resXu25),
    res2over25: pct(res2o25), res2under25: pct(res2u25),
    res1btts: pct(res1btts), resXbtts: pct(resXbtts), res2btts: pct(res2btts),
    dc1xbtts: pct(res1btts + resXbtts), dcx2btts: pct(resXbtts + res2btts), dc12btts: pct(res1btts + res2btts),
  };
}

async function calculateAndSavePredictions(matchId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      homeTeam: true,
      homeTeamId: true,
      awayTeam: true,
      awayTeamId: true,
      externalId: true,
      status: true,
      scheduledAt: true,
      competition: { select: { name: true, externalId: true } },
    },
  });
  if (!match) return null;

  // 1️⃣ Algorithme statistique (forme récente — 10 matchs)
  let predictions = await calculateMatchPredictions(match);

  // 2️⃣ Fallback IA (Claude Haiku) — uniquement si pas amical et dans les 14 jours
  if (!predictions) {
    const compName   = (match.competition?.name || '').toLowerCase();
    const isFriendly = compName.includes('friend') || compName.includes('amical');
    const daysAhead  = match.scheduledAt
      ? (new Date(match.scheduledAt) - Date.now()) / 86_400_000
      : 99;

    if (!isFriendly && daysAhead <= 14) {
      // Récupérer le contexte temps réel (forme, H2H, classement, blessures)
      let context = null;
      try {
        context = await getMatchContext(match);
      } catch (e) {
        console.warn('[Context] Impossible de récupérer le contexte:', e.message);
      }

      predictions = await generateAIPrediction(match, context);
      if (predictions) {
        const dataFlag = predictions.hasRealData ? ' (avec données temps réel)' : ' (sans données)';
        console.log(`[AI] Prédiction IA pour : ${match.homeTeam} vs ${match.awayTeam}${dataFlag}`);
      }
    }
  }

  // 3️⃣ Fallback neutre si tout échoue
  if (!predictions) {
    predictions = generateFallbackPrediction();
  }

  // 4️⃣ Marchés mi-temps + marchés buts avancés — dérivés du résultat final,
  // quelle que soit la source (stats, IA, fallback neutre).
  if (predictions && predictions.home != null) {
    predictions = { ...predictions, ...deriveHalfTimeMarkets(predictions) };
    predictions = { ...predictions, ...deriveGoalMarkets(predictions) };
  }

  await prisma.match.update({ where: { id: matchId }, data: { predictions } });
  return predictions;
}

async function calculatePredictionsForDate(dateStr) {
  const d     = new Date(dateStr);
  const dNext = new Date(dateStr);
  dNext.setDate(dNext.getDate() + 1);

  // Filtre JS pour éviter les subtilités Prisma JSON null
  const allScheduled = await prisma.match.findMany({
    where: {
      scheduledAt: { gte: d, lt: dNext },
      status: 'SCHEDULED',
    },
    select: { id: true, predictions: true },
  });
  const matches = allScheduled.filter((m) => m.predictions === null);

  console.log(`[Predictions] Calcul pour ${matches.length} matchs du ${dateStr}`);
  for (const { id } of matches) {
    await calculateAndSavePredictions(id).catch((e) =>
      console.error(`[Predictions] Erreur match ${id}:`, e.message)
    );
  }
  return matches.length;
}

module.exports = { calculateMatchPredictions, calculateAndSavePredictions, calculatePredictionsForDate, deriveHalfTimeMarkets, deriveGoalMarkets, deriveCornerMarkets };
