// ─── Marchés « statistiques de match » : cartons, tirs cadrés, fautes, hors-jeu ─
// Même principe que les corners (predictionService.deriveCornerMarkets) :
// chaque équipe a une moyenne « produite » et « concédée » sur ses derniers
// matchs, on en déduit un nombre attendu pour chaque équipe (lambda), puis une
// loi de Poisson donne les probabilités Plus/Moins et « quelle équipe en aura
// le plus ».
//
// Source des données : le champ `statistics` (JSON) déjà enregistré à la fin
// de chaque match par cron/syncMatches.js (captureCornerStats, même appel API
// que pour les corners → AUCUNE requête API supplémentaire). L'historique
// existe donc déjà pour tous les matchs terminés depuis l'ajout des corners.

const STAT_FAMILIES = {
  // Cartons = jaunes + rouges (chaque carton compte 1)
  card:    { keys: ['yellow_cards', 'red_cards'], lines: [2.5, 3.5, 4.5, 5.5],     min: 0.3, max: 7,  maxK: 20, flag: 'hasCardData' },
  // Tirs cadrés (« Shots on Goal » chez API-Football)
  sot:     { keys: ['shots_on_goal'],             lines: [6.5, 7.5, 8.5, 9.5],     min: 0.5, max: 12, maxK: 30, flag: 'hasSotData' },
  foul:    { keys: ['fouls'],                      lines: [19.5, 21.5, 23.5, 25.5], min: 4,   max: 20, maxK: 45, flag: 'hasFoulData' },
  offside: { keys: ['offsides'],                   lines: [2.5, 3.5, 4.5],          min: 0.2, max: 6,  maxK: 15, flag: 'hasOffsideData' },
};

const MIN_SAMPLE = 3; // matchs avec la stat disponible, pour chaque équipe

// Clé de marché d'une ligne : (card, 'Over', 3.5) → 'cardOver35'
function lineKey(family, side, line) {
  return `${family}${side}${String(line).replace('.', '')}`;
}

// Valeurs domicile/extérieur d'une famille dans le JSON `statistics` d'un
// match, ou null si la stat n'a pas été fournie (championnat peu couvert).
function statFromMatch(statistics, family) {
  if (!Array.isArray(statistics) || statistics.length === 0) return null;
  const { keys } = STAT_FAMILIES[family];
  let home = 0, away = 0, found = false;
  for (const key of keys) {
    const s = statistics.find((x) => x.key === key);
    if (!s) continue;
    found = true;
    home += Number(s.home) || 0;
    away += Number(s.away) || 0;
  }
  return found ? { home, away } : null;
}

// Moyennes « pour / contre » d'une équipe sur ses matchs, pour chaque famille.
function teamStatAverages(matches, teamName) {
  const out = {};
  for (const family of Object.keys(STAT_FAMILIES)) {
    let forSum = 0, againstSum = 0, n = 0;
    for (const m of matches) {
      const v = statFromMatch(m.statistics, family);
      if (!v) continue;
      const isHome = m.homeTeam === teamName;
      forSum     += isHome ? v.home : v.away;
      againstSum += isHome ? v.away : v.home;
      n++;
    }
    out[family] = { avgFor: n ? forSum / n : null, avgAgainst: n ? againstSum / n : null, sample: n };
  }
  return out;
}

function poissonPmf(lambda, maxK) {
  const p = new Array(maxK + 1);
  p[0] = Math.exp(-lambda);
  for (let k = 1; k <= maxK; k++) p[k] = (p[k - 1] * lambda) / k;
  return p;
}

const pct = (x) => Math.round(Math.max(0, Math.min(1, x)) * 100);

// Marchés d'une famille à partir des nombres attendus de chaque équipe.
function deriveFamilyMarkets(family, lambdaHome, lambdaAway) {
  const cfg = STAT_FAMILIES[family];
  const lH = Math.max(cfg.min, Math.min(cfg.max, lambdaHome));
  const lA = Math.max(cfg.min, Math.min(cfg.max, lambdaAway));
  const pH = poissonPmf(lH, cfg.maxK);
  const pA = poissonPmf(lA, cfg.maxK);

  let more1 = 0, equal = 0, more2 = 0;
  const totalDist = new Array(cfg.maxK * 2 + 1).fill(0);
  for (let h = 0; h <= cfg.maxK; h++) {
    for (let a = 0; a <= cfg.maxK; a++) {
      const p = pH[h] * pA[a];
      if (h > a) more1 += p; else if (h === a) equal += p; else more2 += p;
      totalDist[h + a] += p;
    }
  }

  const markets = {
    [`${family}1`]: pct(more1),
    [`${family}X`]: pct(equal),
    [`${family}2`]: pct(more2),
    [`${family}Expected`]: Math.round((lH + lA) * 10) / 10,
    [cfg.flag]: true,
  };
  for (const line of cfg.lines) {
    let under = 0;
    for (let t = 0; t <= Math.floor(line); t++) under += totalDist[t];
    markets[lineKey(family, 'Over', line)]  = pct(1 - under);
    markets[lineKey(family, 'Under', line)] = pct(under);
  }
  return markets;
}

/**
 * Tous les marchés stats disponibles pour un match, à partir des derniers
 * matchs de chaque équipe (doivent inclure `statistics`, `homeTeam`).
 * Une famille n'apparaît que si les deux équipes ont assez d'historique.
 */
function deriveStatMarkets(homeTeam, awayTeam, homeMatches, awayMatches) {
  const hs = teamStatAverages(homeMatches, homeTeam);
  const as = teamStatAverages(awayMatches, awayTeam);
  let result = {};
  for (const family of Object.keys(STAT_FAMILIES)) {
    const h = hs[family], a = as[family];
    if (h.sample < MIN_SAMPLE || a.sample < MIN_SAMPLE) continue;
    const lambdaHome = (h.avgFor + a.avgAgainst) / 2;
    const lambdaAway = (a.avgFor + h.avgAgainst) / 2;
    result = { ...result, ...deriveFamilyMarkets(family, lambdaHome, lambdaAway) };
  }
  return result;
}

// Résultat d'un pari stat une fois le match terminé : 'WIN' | 'LOSS' | null
// (null = pas un marché stat, ou stat indisponible pour ce match).
function resolveStatPick(type, statistics) {
  const m = /^(card|sot|foul|offside)(1|X|2|Over|Under)(\d+)?$/.exec(type || '');
  if (!m) return null;
  const [, family, kind, lineDigits] = m;
  const v = statFromMatch(statistics, family);
  if (!v) return null;
  if (kind === '1') return v.home > v.away ? 'WIN' : 'LOSS';
  if (kind === 'X') return v.home === v.away ? 'WIN' : 'LOSS';
  if (kind === '2') return v.away > v.home ? 'WIN' : 'LOSS';
  if (!lineDigits) return null;
  const line = Number(`${lineDigits.slice(0, -1)}.${lineDigits.slice(-1)}`);
  const total = v.home + v.away;
  if (kind === 'Over') return total > line ? 'WIN' : 'LOSS';
  return total < line ? 'WIN' : 'LOSS';
}

module.exports = { STAT_FAMILIES, deriveStatMarkets, resolveStatPick, statFromMatch, teamStatAverages };
