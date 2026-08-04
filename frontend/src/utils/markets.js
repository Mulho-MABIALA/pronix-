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
  { id: 'resulttotal',  emoji: '➕', markets: ['res1over25', 'res1under25', 'resXover25', 'resXunder25', 'res2over25', 'res2under25'] },
  { id: 'resultbtts',   emoji: '🧩', markets: ['res1btts', 'resXbtts', 'res2btts', 'dc1xbtts', 'dcx2btts', 'dc12btts'] },
  { id: 'totalpair',    emoji: '🔢', markets: ['totalpair', 'totalimpair'] },
  { id: 'corners1x2',      emoji: '🚩', markets: ['corner1', 'cornerX', 'corner2'] },
  { id: 'cornerstotal',    emoji: '🚩', markets: ['cornerOver85', 'cornerUnder85', 'cornerOver95', 'cornerUnder95', 'cornerOver105', 'cornerUnder105'] },
  { id: 'cornershandicap', emoji: '🚩', markets: ['cornerHandHome25', 'cornerHandAway25'] },
];

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
