// Couleur associée à la famille de marché d'un pronostic (1X2, Over/Under,
// BTTS, Double chance, Draw No Bet, mi-temps) — pour que le pick affiché
// ("Plus de 1.5 buts", "Victoire domicile"...) attire l'œil au lieu de rester
// en gris uniforme partout dans l'app (Pronostics, Machine, MatchDetail, Home).
// Classé par `type` (toujours disponible) plutôt que par le libellé `market`
// (parfois absent, ex: marchés mi-temps générés côté client dans Machine.jsx).
const FAMILY_COLORS = {
  '1x2':          { text: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20' },
  doublechance:   { text: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
  dnb:            { text: 'text-teal-400',    bg: 'bg-teal-500/10',    border: 'border-teal-500/20' },
  overunder:      { text: 'text-orange-400',  bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  btts:           { text: 'text-violet-400',  bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  mitemps:        { text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
  handicap:       { text: 'text-sky-400',     bg: 'bg-sky-500/10',    border: 'border-sky-500/20' },
  multibuts:      { text: 'text-rose-400',    bg: 'bg-rose-500/10',   border: 'border-rose-500/20' },
  combo:          { text: 'text-lime-400',    bg: 'bg-lime-500/10',   border: 'border-lime-500/20' },
  exactscore:     { text: 'text-yellow-400',  bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  corners:        { text: 'text-orange-300',  bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
};
const DEFAULT_COLOR = { text: 'text-ink-3', bg: 'bg-surface-700/50', border: 'border-overlay/[0.08]' };

export function getMarketFamily(type) {
  if (!type) return null;
  if (['1', 'X', '2'].includes(type)) return '1x2';
  if (['1X', 'X2', '12'].includes(type)) return 'doublechance';
  if (['dnb1', 'dnb2'].includes(type)) return 'dnb';
  if (type.startsWith('ht')) return 'mitemps';
  if (type === 'btts' || type === 'nobtts') return 'btts';
  if (type.includes('over') || type.includes('under')) return 'overunder';
  if (['h1m1', 'h2m1'].includes(type)) return 'handicap';
  if (['mb1_2plus', 'mb2_2plus', 'cleansheet1', 'cleansheet2', 'totalpair', 'totalimpair'].includes(type)) return 'multibuts';
  if (type.startsWith('res') || type.startsWith('dc1x') || type.startsWith('dcx2') || type.startsWith('dc12')) return 'combo';
  if (/^\d+-\d+$/.test(type)) return 'exactscore'; // score exact, ex. "2-1"
  if (type.startsWith('corner')) return 'corners';
  // Marchés live (Machine.jsx mode "Direct" / Pronostics.jsx matchs en cours) —
  // mêmes familles de couleur que leurs équivalents pré-match, préfixées "live".
  if (['live1', 'liveX', 'live2'].includes(type)) return '1x2';
  if (type.startsWith('liveOver') || type.startsWith('liveUnder')) return 'overunder';
  if (type.startsWith('liveCorner')) return 'corners';
  return null;
}

// Retourne { text, bg, border } — classes Tailwind prêtes à l'emploi.
export function getPickColor(type) {
  const family = getMarketFamily(type);
  return FAMILY_COLORS[family] || DEFAULT_COLOR;
}

// Équivalents hex des mêmes couleurs (-400), pour le canvas du ticket
// partageable (ticketCanvas.js) où Tailwind n'est pas disponible.
const FAMILY_HEX = {
  '1x2':         '#2ec16a',
  doublechance:  '#22d3ee',
  dnb:           '#2dd4bf',
  overunder:     '#fb923c',
  btts:          '#a78bfa',
  mitemps:       '#e879f9',
  handicap:      '#38bdf8',
  multibuts:     '#fb7185',
  combo:         '#a3e635',
  exactscore:    '#facc15',
  corners:       '#fdba74',
};
const DEFAULT_HEX = '#9a9fa6';

export function getPickHexColor(type) {
  const family = getMarketFamily(type);
  return FAMILY_HEX[family] || DEFAULT_HEX;
}
