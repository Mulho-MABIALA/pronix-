// ─── Catalogue de marchés partagé — Machine.jsx (générateur) & Pronostics.jsx ──
// Centralisé ici pour que les deux pages restent en phase : un marché ajouté
// pour l'un est automatiquement disponible dans l'autre. Les labels/descriptions
// vivent dans les fichiers de locale sous machine.marketGroups.* (réutilisé
// tel quel par Pronostics, pas de duplication de clés i18n).

// ─── Marchés pré-match — labels/descriptions dans machine.marketGroups.* (i18n) ──
export const MARKET_GROUPS = [
  { id: 'resultats',    emoji: '🏆', markets: ['auto', '1', 'X', '2'] },
  { id: 'doublechance', emoji: '🔀', markets: ['1X', 'X2', '12'] },
  { id: 'dnb',          emoji: '🛡️', markets: ['dnb1', 'dnb2'] },
  { id: 'overunder',    emoji: '⚽', markets: ['over05', 'over15', 'over25', 'over35', 'over45', 'under15', 'under25', 'under35', 'under45'] },
  { id: 'btts',         emoji: '🥅', markets: ['btts', 'nobtts'] },
  { id: 'mitemps',      emoji: '⏱️', markets: ['ht1', 'htX', 'ht2', 'htover15', 'htunder15'] },
  { id: 'scoreexact',   emoji: '🎯', markets: ['exactscore'] },
  { id: 'handicap',     emoji: '📐', markets: ['h1m1', 'h2m1'] },
  { id: 'multibuts',    emoji: '🔥', markets: ['mb1_2plus', 'mb2_2plus', 'cleansheet1', 'cleansheet2'] },
  { id: 'resulttotal',  emoji: '➕', markets: ['res1over15', 'res1over25', 'res1under25', 'resXover25', 'resXunder25', 'res2over15', 'res2over25', 'res2under25'] },
  { id: 'resultbtts',   emoji: '🧩', markets: ['res1btts', 'resXbtts', 'res2btts', 'dc1xbtts', 'dcx2btts', 'dc12btts'] },
  { id: 'totalpair',    emoji: '🔢', markets: ['totalpair', 'totalimpair'] },
  // Combinaisons supplémentaires (backend predictionService.deriveComboMarkets)
  { id: 'dctotal',      emoji: '🔀', markets: ['dc1xover15', 'dc1xunder35', 'dcx2over15', 'dcx2under35', 'dc12over15', 'dc12under35'] },
  { id: 'bttstotal',    emoji: '🥅', markets: ['bttsover25', 'bttsunder35', 'nobttsunder25', 'nobttsover15'] },
  { id: 'htft',         emoji: '⏱️', markets: ['htft11', 'htft1X', 'htft12', 'htftX1', 'htftXX', 'htftX2', 'htft21', 'htft2X', 'htft22'] },
  // Paris par joueur (backend utils/playerMarkets.js) — le joueur le plus probable du match
  { id: 'buteurs',      emoji: '⚽', markets: ['anytimescorer', 'playersot'] },
  { id: 'corners1x2',      emoji: '🚩', markets: ['corner1', 'cornerX', 'corner2'] },
  { id: 'cornerstotal',    emoji: '🚩', markets: ['cornerOver85', 'cornerUnder85', 'cornerOver95', 'cornerUnder95', 'cornerOver105', 'cornerUnder105'] },
  { id: 'cornershandicap', emoji: '🚩', markets: ['cornerHandHome25', 'cornerHandAway25'] },
  // Stats de match (backend utils/statMarkets.js) — présentes seulement quand
  // les deux équipes ont assez d'historique ; sinon le marché est ignoré.
  { id: 'cards1x2',        emoji: '🟨', markets: ['card1', 'cardX', 'card2'] },
  { id: 'cardstotal',      emoji: '🟨', markets: ['cardOver25', 'cardUnder25', 'cardOver35', 'cardUnder35', 'cardOver45', 'cardUnder45', 'cardOver55', 'cardUnder55'] },
  { id: 'sot1x2',          emoji: '👟', markets: ['sot1', 'sotX', 'sot2'] },
  { id: 'sottotal',        emoji: '👟', markets: ['sotOver65', 'sotUnder65', 'sotOver75', 'sotUnder75', 'sotOver85', 'sotUnder85', 'sotOver95', 'sotUnder95'] },
  { id: 'foulstotal',      emoji: '🛑', markets: ['foulOver195', 'foulUnder195', 'foulOver215', 'foulUnder215', 'foulOver235', 'foulUnder235', 'foulOver255', 'foulUnder255'] },
  { id: 'offsidestotal',   emoji: '📏', markets: ['offsideOver25', 'offsideUnder25', 'offsideOver35', 'offsideUnder35', 'offsideOver45', 'offsideUnder45'] },
];

// Familles « stats de match » → drapeau de présence des données dans
// m.predictions. Pas de valeur de repli inventée pour ces marchés : sans
// historique réel, getProb renvoie null et le match est simplement ignoré
// (Machine) ou non affiché (Pronostics).
const STAT_FAMILY_FLAGS = { card: 'hasCardData', sot: 'hasSotData', foul: 'hasFoulData', offside: 'hasOffsideData' };
const STAT_MARKET_RE = /^(card|sot|foul|offside)(1|X|2|Over\d+|Under\d+)$/;

// Combinaisons ajoutées après coup : pas de valeur de repli — absentes des
// pronostics calculés avant leur ajout, le match est alors ignoré.
const STRICT_COMBO_RE = /^(dc1x|dcx2|dc12)(over15|under35)$|^(btts|nobtts)(over\d+|under\d+)$|^res[12]over15$|^htft[1X2][1X2]$/;

// ─── Marchés LIVE (matchs en cours, mode "Direct") ─────────────────────────
// Contrairement à MARKET_GROUPS, les valeurs ne viennent pas de m.predictions
// (calculées une fois avant le match) mais de /matches/:id/live-markets
// (recalculées à la demande, cf. predictionService.deriveLiveMarkets côté
// backend). Réservé Premium.
export const LIVE_MARKET_GROUPS = [
  { id: 'liveresultats',  emoji: '🔴', markets: ['live1', 'liveX', 'live2'] },
  { id: 'liveoverunder',  emoji: '⚽', markets: ['liveOver05', 'liveOver15', 'liveOver25', 'liveOver35', 'liveUnder05', 'liveUnder15', 'liveUnder25', 'liveUnder35'] },
  { id: 'livescoreexact', emoji: '🎯', markets: ['livescoreexact'] },
  { id: 'livecorners',    emoji: '🚩', markets: ['liveCornerOver75', 'liveCornerUnder75', 'liveCornerOver85', 'liveCornerUnder85', 'liveCornerOver95', 'liveCornerUnder95', 'liveCornerOver105', 'liveCornerUnder105'] },
];

// pred : objet predictions pré-match (Match.predictions). Retourne
// { type, prob } — jamais null pour un marché connu, car chaque marché a un
// repli heuristique (pred.field ?? valeur plausible) pour rester exploitable
// sur les prédictions anciennes calculées avant l'ajout de ce champ. Voir
// bestPickInGroup() pour un filtrage plus strict (ex: corners réels uniquement).
export function getProb(pred, market) {
  if (market === 'auto' || !market) return pred.bestPick;

  if (STRICT_COMBO_RE.test(market)) {
    return pred[market] == null ? null : { type: market, prob: pred[market] };
  }

  // Paris par joueur : le joueur le plus probable du match. Le type encode
  // l'id et le nom ("scorer:<id>:<nom>") pour régler le pari et l'afficher.
  if (market === 'anytimescorer' || market === 'playersot') {
    const players = pred.hasPlayerData && Array.isArray(pred.players) ? pred.players : [];
    if (players.length === 0) return null;
    const field = market === 'anytimescorer' ? 'goal' : 'sot';
    const best = players.reduce((b, p) => (p[field] > (b?.[field] ?? -1) ? p : b), null);
    if (!best) return null;
    return { type: `${market === 'anytimescorer' ? 'scorer' : 'psot'}:${best.id}:${best.name}`, prob: best[field] };
  }

  // Cartons / tirs cadrés / fautes / hors-jeu : données réelles uniquement
  const stat = STAT_MARKET_RE.exec(market);
  if (stat) {
    if (!pred[STAT_FAMILY_FLAGS[stat[1]]] || pred[market] == null) return null;
    return { type: market, prob: pred[market] };
  }

  // Score exact : cas particulier, le "type" affiché est le score lui-même
  // (ex. "2-1") et non une clé i18n fixe — géré à part du probMap ci-dessous.
  if (market === 'exactscore') {
    return { type: pred.exactScore ?? '0-0', prob: pred.exactScoreProb ?? 15 };
  }

  // Valeurs de base
  const h  = pred.home  ?? 33;
  const d  = pred.draw  ?? 33;
  const a  = pred.away  ?? 33;
  const o15 = pred.over15 ?? 70;
  const o25 = pred.over25 ?? 50;
  const o35 = pred.over35 ?? 25;
  const bt  = pred.btts  ?? 50;
  const sum = (h + a) || 1;

  // Dérivations pour marchés absents de la DB (matchs anciens sans ces champs)
  const over05  = pred.over05  ?? Math.min(99, Math.round(82 + (o15 - 70) * 0.8));
  const over45  = pred.over45  ?? Math.max(2,  Math.round(o35 * 0.42));
  const under45 = 100 - over45;
  const under35 = pred.under35 ?? (100 - o35);
  const under25 = pred.under25 ?? (100 - o25);
  const under15 = pred.under15 ?? (100 - o15);
  const dc12    = pred.dc12    ?? Math.min(99, h + a);
  const nobtts  = pred.nobtts  ?? (100 - bt);
  const dnb1    = Math.round((h / sum) * 100); // Draw No Bet domicile
  const dnb2    = Math.round((a / sum) * 100); // Draw No Bet extérieur

  // Marchés mi-temps — utilisent les champs calculés côté backend (Poisson),
  // avec repli approximatif pour les matchs anciens sans ces champs.
  const htOver15 = pred.htOver15 ?? Math.max(5, Math.round(o25 * 0.7));

  const probMap = {
    '1':       h,
    'X':       d,
    '2':       a,
    '1X':      pred.dc1x ?? Math.min(99, h + d),
    'X2':      pred.dc2x ?? Math.min(99, a + d),
    '12':      dc12,
    'dnb1':    dnb1,
    'dnb2':    dnb2,
    'over05':  over05,
    'over15':  o15,
    'over25':  o25,
    'over35':  o35,
    'over45':  over45,
    'under15': under15,
    'under25': under25,
    'under35': under35,
    'under45': under45,
    'btts':    bt,
    'nobtts':  nobtts,
    'ht1':       pred.htHome  ?? Math.round(h * 0.62),
    'htX':       pred.htDraw  ?? Math.min(70, d + 15),
    'ht2':       pred.htAway  ?? Math.round(a * 0.55),
    'htover15':  htOver15,
    'htunder15': pred.htUnder15 ?? (100 - htOver15),

    // Handicap européen (victoire avec 2 buts d'écart ou plus)
    'h1m1': pred.h1m1 ?? Math.round(h * 0.32),
    'h2m1': pred.h2m1 ?? Math.round(a * 0.30),

    // Multi-buts / gagne sans encaisser
    'mb1_2plus':   pred.mb1_2plus   ?? Math.round(h * 0.50),
    'mb2_2plus':   pred.mb2_2plus   ?? Math.round(a * 0.45),
    'cleansheet1': pred.cleansheet1 ?? Math.round(h * 0.35),
    'cleansheet2': pred.cleansheet2 ?? Math.round(a * 0.30),

    // Total de buts pair / impair
    'totalpair':   pred.totalpair   ?? 50,
    'totalimpair': pred.totalimpair ?? 50,

    // Résultat + Total buts (approximation par indépendance si absent)
    'res1over25':  pred.res1over25  ?? Math.round(h * (o25 / 100)),
    'res1under25': pred.res1under25 ?? Math.round(h * (1 - o25 / 100)),
    'resXover25':  pred.resXover25  ?? Math.round(d * (o25 / 100)),
    'resXunder25': pred.resXunder25 ?? Math.round(d * (1 - o25 / 100)),
    'res2over25':  pred.res2over25  ?? Math.round(a * (o25 / 100)),
    'res2under25': pred.res2under25 ?? Math.round(a * (1 - o25 / 100)),

    // Résultat + BTTS / Double chance + BTTS
    'res1btts':  pred.res1btts  ?? Math.round(h * (bt / 100)),
    'resXbtts':  pred.resXbtts  ?? Math.round(d * (bt / 100)),
    'res2btts':  pred.res2btts  ?? Math.round(a * (bt / 100)),
    'dc1xbtts':  pred.dc1xbtts  ?? Math.round((h + d) * (bt / 100)),
    'dcx2btts':  pred.dcx2btts  ?? Math.round((d + a) * (bt / 100)),
    'dc12btts':  pred.dc12btts  ?? Math.round((h + a) * (bt / 100)),

    // Marchés corners — repli neutre (priors génériques) tant que l'historique
    // de corners par équipe n'est pas assez fourni (voir predictionService.js,
    // hasCornerData n'est présent que si cornerSampleSize ≥ 3 des deux côtés).
    'corner1':          pred.corner1          ?? 40,
    'cornerX':          pred.cornerX          ?? 24,
    'corner2':          pred.corner2          ?? 36,
    'cornerOver85':     pred.cornerOver85     ?? 55,
    'cornerUnder85':    pred.cornerUnder85    ?? 45,
    'cornerOver95':     pred.cornerOver95     ?? 45,
    'cornerUnder95':    pred.cornerUnder95    ?? 55,
    'cornerOver105':    pred.cornerOver105    ?? 32,
    'cornerUnder105':   pred.cornerUnder105   ?? 68,
    'cornerHandHome25': pred.cornerHandHome25 ?? 22,
    'cornerHandAway25': pred.cornerHandAway25 ?? 18,
  };

  const prob = probMap[market];
  if (prob == null) return pred.bestPick;
  return { type: market, prob };
}

// Équivalent de getProb() pour le mode Direct — lit directement la réponse
// de /matches/:id/live-markets (les noms de champs y sont déjà alignés sur
// les clés de marché : live1, liveOver25, liveCornerOver85...), donc pas
// besoin d'un probMap comme getProb(). Retourne null si la donnée n'existe
// pas encore (requête en cours) ou si les corners live ne sont pas dispo
// pour ce match (hasLiveCornerData: false).
export function getLiveProb(liveData, market) {
  if (!liveData) return null;
  if (market === 'livescoreexact') {
    if (liveData.liveExactScore == null) return null;
    return { type: liveData.liveExactScore, prob: liveData.liveExactScoreProb };
  }
  if (market.startsWith('liveCorner') && !liveData.hasLiveCornerData) return null;
  const prob = liveData[market];
  if (prob == null) return null;
  return { type: market, prob };
}

// Meilleur pick au sein d'une liste de clés de marché (ex: tous les marchés
// "corners1x2"+"cornerstotal"+"cornershandicap" réunis) — utilisé par
// Pronostics.jsx pour afficher/filtrer par catégorie plutôt que par le seul
// "meilleur pick" global du match (qui n'est presque jamais un marché corner/
// handicap/score exact, ces marchés ayant structurellement des probabilités
// plus basses qu'un simple 1X2 ou Over/Under). requireRealCornerData=true
// exclut les matchs sans historique de corners réel plutôt que de se rabattre
// sur les priors neutres de getProb (pertinent pour une page de consultation
// comme Pronostics, contrairement au générateur qui doit toujours produire
// un pick).
export function bestPickInGroup(pred, marketKeys, { requireRealCornerData = false } = {}) {
  if (!pred) return null;
  if (requireRealCornerData && !pred.hasCornerData) return null;
  let best = null;
  for (const key of marketKeys) {
    const pick = getProb(pred, key);
    if (pick && (best === null || pick.prob > best.prob)) best = pick;
  }
  return best;
}

// Équivalent live de bestPickInGroup — retourne null si aucune donnée live
// n'est encore disponible pour aucun des marchés demandés.
export function bestLivePickInGroup(liveData, marketKeys) {
  if (!liveData) return null;
  let best = null;
  for (const key of marketKeys) {
    const pick = getLiveProb(liveData, key);
    if (pick && (best === null || pick.prob > best.prob)) best = pick;
  }
  return best;
}

// Résultat d'un pick stat (cartons, tirs cadrés, fautes, hors-jeu) une fois
// le match terminé, d'après le JSON `statistics` du match — même règle que le
// backend (utils/statMarkets.js resolveStatPick). true / false, ou null si
// ce n'est pas un marché stat ou si la stat est indisponible pour ce match.
const STAT_KEYS = {
  card: ['yellow_cards', 'red_cards'],
  sot: ['shots_on_goal'],
  foul: ['fouls'],
  offside: ['offsides'],
};
export function statPickIsCorrect(type, statistics) {
  const m = /^(card|sot|foul|offside)(1|X|2|Over|Under)(\d+)?$/.exec(type || '');
  if (!m || !Array.isArray(statistics)) return null;
  const [, family, kind, digits] = m;
  let home = 0, away = 0, found = false;
  for (const key of STAT_KEYS[family]) {
    const s = statistics.find((x) => x.key === key);
    if (!s) continue;
    found = true;
    home += Number(s.home) || 0;
    away += Number(s.away) || 0;
  }
  if (!found) return null;
  if (kind === '1') return home > away;
  if (kind === 'X') return home === away;
  if (kind === '2') return away > home;
  if (!digits) return null;
  const line = Number(`${digits.slice(0, -1)}.${digits.slice(-1)}`);
  return kind === 'Over' ? home + away > line : home + away < line;
}

// Libellé affichable d'un pick, y compris les paris joueur dont le type est
// dynamique ("scorer:<id>:<nom>"). ns = clé i18n des libellés courts.
export function pickDisplayLabel(t, type, ns = 'machine.pickLabels', fallback) {
  const m = /^(scorer|psot):([^:]+):(.*)$/.exec(type || '');
  if (m) return t(m[1] === 'scorer' ? 'machine.playerPick.scorer' : 'machine.playerPick.sot', { name: m[3] });
  if (/^\d+-\d+$/.test(type || '')) return type; // score exact
  return t(`${ns}.${type}`, { defaultValue: fallback ?? type });
}

// Résultat (Pronostics) des combinaisons ajoutées — score final + mi-temps.
export function comboPickIsCorrect(type, h, a, match) {
  const total = h + a;
  const r = (x, y) => (x > y ? '1' : x === y ? 'X' : '2');
  const ht = /^htft([1X2])([1X2])$/.exec(type || '');
  if (ht) {
    if (match?.htHomeScore == null || match?.htAwayScore == null) return null;
    return ht[1] === r(match.htHomeScore, match.htAwayScore) && ht[2] === r(h, a);
  }
  const c = /^(dc1x|dcx2|dc12|btts|nobtts|res1|resX|res2)(over15|under35|over25|under25|btts)$/.exec(type || '');
  if (!c) return null;
  const left = { dc1x: h >= a, dcx2: a >= h, dc12: h !== a, btts: h > 0 && a > 0, nobtts: !(h > 0 && a > 0), res1: h > a, resX: h === a, res2: a > h }[c[1]];
  const right = { over15: total > 1.5, under35: total < 3.5, over25: total > 2.5, under25: total < 2.5, btts: h > 0 && a > 0 }[c[2]];
  return left && right;
}
