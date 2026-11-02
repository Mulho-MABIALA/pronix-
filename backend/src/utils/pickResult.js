const { resolveStatPick } = require('./statMarkets');
const { resolvePlayerPick } = require('./playerMarkets');

// Résout un pick (marché du générateur de tickets) au vu du score final.
// Retourne 'WIN' | 'LOSS' | 'VOID' (remboursé, ex. Draw No Bet sur un match nul)
// ou `null` si le score n'est pas encore disponible.
//
// Couvre l'ensemble des marchés proposés par Machine.jsx (machine.pickLabels) —
// volontairement séparé du pickIsCorrect() simplifié de transparencyController.js
// (qui ne couvre que les marchés utilisés par les stats tipsters/IA) pour ne pas
// risquer de modifier un calcul déjà en prod.
// extra (optionnel) : { homeCorners, awayCorners, statistics, htHomeScore,
// htAwayScore, playerStats } — nécessaires
// pour régler les paris corners / cartons / tirs cadrés / fautes / hors-jeu.
// Sans ces données, ces paris restent « en attente » (null) plutôt que d'être
// déclarés perdus à tort.
function resolvePick(type, homeScore, awayScore, extra = {}) {
  if (homeScore == null || awayScore == null) return null;
  const h = homeScore;
  const a = awayScore;
  const total = h + a;

  switch (type) {
    case '1':  return h > a ? 'WIN' : 'LOSS';
    case 'X':  return h === a ? 'WIN' : 'LOSS';
    case '2':  return a > h ? 'WIN' : 'LOSS';
    case '1X': return h >= a ? 'WIN' : 'LOSS';
    case 'X2': return a >= h ? 'WIN' : 'LOSS';
    case '12': return h !== a ? 'WIN' : 'LOSS';
    case 'dnb1': return h === a ? 'VOID' : (h > a ? 'WIN' : 'LOSS');
    case 'dnb2': return h === a ? 'VOID' : (a > h ? 'WIN' : 'LOSS');
    case 'over05': return total > 0.5 ? 'WIN' : 'LOSS';
    case 'over15': return total > 1.5 ? 'WIN' : 'LOSS';
    case 'over25': return total > 2.5 ? 'WIN' : 'LOSS';
    case 'over35': return total > 3.5 ? 'WIN' : 'LOSS';
    case 'over45': return total > 4.5 ? 'WIN' : 'LOSS';
    case 'under15': return total < 1.5 ? 'WIN' : 'LOSS';
    case 'under25': return total < 2.5 ? 'WIN' : 'LOSS';
    case 'under35': return total < 3.5 ? 'WIN' : 'LOSS';
    case 'under45': return total < 4.5 ? 'WIN' : 'LOSS';
    case 'btts':   return (h > 0 && a > 0) ? 'WIN' : 'LOSS';
    case 'nobtts': return (h > 0 && a > 0) ? 'LOSS' : 'WIN';
    // Handicap / multi-buts / clean sheet / pair-impair (déduits du score)
    case 'h1m1': return h - a >= 2 ? 'WIN' : 'LOSS';
    case 'h2m1': return a - h >= 2 ? 'WIN' : 'LOSS';
    case 'mb1_2plus': return h >= 2 ? 'WIN' : 'LOSS';
    case 'mb2_2plus': return a >= 2 ? 'WIN' : 'LOSS';
    case 'cleansheet1': return h > a && a === 0 ? 'WIN' : 'LOSS';
    case 'cleansheet2': return a > h && h === 0 ? 'WIN' : 'LOSS';
    case 'totalpair':   return total % 2 === 0 ? 'WIN' : 'LOSS';
    case 'totalimpair': return total % 2 === 1 ? 'WIN' : 'LOSS';
    default: break;
  }

  // Paris par joueur (buteur, tir cadré) — "scorer:<id>:<nom>" / "psot:..."
  if (/^(scorer|psot):/.test(type || '')) return resolvePlayerPick(type, extra.playerStats);

  // Mi-temps et Mi-temps / Fin de match (score à la pause requis)
  if (/^(ht1|htX|ht2|htover15|htunder15|htft[1X2][1X2])$/.test(type || '')) {
    const hh = extra.htHomeScore, ha = extra.htAwayScore;
    if (hh == null || ha == null) return null;
    const r = (x, y) => (x > y ? '1' : x === y ? 'X' : '2');
    if (type === 'ht1') return hh > ha ? 'WIN' : 'LOSS';
    if (type === 'htX') return hh === ha ? 'WIN' : 'LOSS';
    if (type === 'ht2') return ha > hh ? 'WIN' : 'LOSS';
    if (type === 'htover15') return hh + ha > 1.5 ? 'WIN' : 'LOSS';
    if (type === 'htunder15') return hh + ha < 1.5 ? 'WIN' : 'LOSS';
    return type === `htft${r(hh, ha)}${r(h, a)}` ? 'WIN' : 'LOSS';
  }

  // Double chance + total / BTTS + total / Résultat + plus de 1.5
  const dct = /^(dc1x|dcx2|dc12|btts|nobtts|res1|res2)(over15|under35|over25|under25)$/.exec(type || '');
  // (res1/res2 + over25/under25 sont réglés plus bas avec les autres combos résultat)
  const isNewCombo = dct && (/^(btts|nobtts)$/.test(dct[1]) || ['over15', 'under35'].includes(dct[2]));
  if (isNewCombo) {
    const [, left, right] = dct;
    const okLeft = { dc1x: h >= a, dcx2: a >= h, dc12: h !== a, btts: h > 0 && a > 0, nobtts: !(h > 0 && a > 0), res1: h > a, res2: a > h }[left];
    const okRight = { over15: total > 1.5, under35: total < 3.5, over25: total > 2.5, under25: total < 2.5 }[right];
    return okLeft && okRight ? 'WIN' : 'LOSS';
  }

  // Score exact (ex. "2-1")
  if (/^\d+-\d+$/.test(type || '')) return type === `${h}-${a}` ? 'WIN' : 'LOSS';

  // Résultat + total / Résultat + BTTS / Double chance + BTTS
  const combo = /^(res1|resX|res2|dc1x|dcx2|dc12)(over25|under25|btts)$/.exec(type || '');
  if (combo) {
    const [, res, cond] = combo;
    const resOk = { res1: h > a, resX: h === a, res2: a > h, dc1x: h >= a, dcx2: a >= h, dc12: h !== a }[res];
    const condOk = cond === 'over25' ? total > 2.5 : cond === 'under25' ? total < 2.5 : (h > 0 && a > 0);
    return resOk && condOk ? 'WIN' : 'LOSS';
  }

  // Corners
  if ((type || '').startsWith('corner')) {
    const hc = extra.homeCorners, ac = extra.awayCorners;
    if (hc == null || ac == null) return null;
    const tc = hc + ac;
    const map = {
      corner1: hc > ac, cornerX: hc === ac, corner2: ac > hc,
      cornerOver85: tc > 8.5, cornerUnder85: tc < 8.5,
      cornerOver95: tc > 9.5, cornerUnder95: tc < 9.5,
      cornerOver105: tc > 10.5, cornerUnder105: tc < 10.5,
      cornerHandHome25: hc - ac >= 3, cornerHandAway25: ac - hc >= 3,
    };
    if (!(type in map)) return null;
    return map[type] ? 'WIN' : 'LOSS';
  }

  // Cartons, tirs cadrés, fautes, hors-jeu
  return resolveStatPick(type, extra.statistics);
}

module.exports = { resolvePick };
