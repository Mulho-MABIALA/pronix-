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
};
const DEFAULT_HEX = '#9a9fa6';

export function getPickHexColor(type) {
  const family = getMarketFamily(type);
  return FAMILY_HEX[family] || DEFAULT_HEX;
}
