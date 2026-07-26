// Résout un pick (marché du générateur de tickets) au vu du score final.
// Retourne 'WIN' | 'LOSS' | 'VOID' (remboursé, ex. Draw No Bet sur un match nul)
// ou `null` si le score n'est pas encore disponible.
//
// Couvre l'ensemble des marchés proposés par Machine.jsx (machine.pickLabels) —
// volontairement séparé du pickIsCorrect() simplifié de transparencyController.js
// (qui ne couvre que les marchés utilisés par les stats tipsters/IA) pour ne pas
// risquer de modifier un calcul déjà en prod.
function resolvePick(type, homeScore, awayScore) {
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
    default: return null;
  }
}

module.exports = { resolvePick };
