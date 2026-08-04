// Libellé d'affichage d'une compétition — évite d'afficher un nom générique
// ambigu ("First League", "Premier Division", "Division 1"...) sans préciser
// de quel pays il s'agit. Les grandes compétitions que tout le monde connaît
// (top 5 championnats européens, grands tournois internationaux) restent
// affichées sans le pays, pour ne pas alourdir inutilement l'affichage.
const MAJOR_LEAGUES = [
  { name: 'Premier League', country: 'England' },
  { name: 'La Liga', country: 'Spain' },
  { name: 'Serie A', country: 'Italy' },
  { name: 'Bundesliga', country: 'Germany' },
  { name: 'Ligue 1', country: 'France' },
  { name: 'UEFA Champions League' },
  { name: 'UEFA Europa League' },
  { name: 'UEFA Europa Conference League' },
  { name: 'Africa Cup of Nations' },
];

const TOURNAMENT_KEYWORDS = [
  'world cup', 'euro champ', 'european champ', 'copa america',
  'africa cup of nations', 'afcon', 'nations league', 'confederations cup',
  'caf champions league', 'copa libertadores', 'coupe du monde', "coupe d'afrique",
];

export function isMajorCompetition(name, country) {
  const n = (name || '').toLowerCase();
  if (!n) return false;
  const c = (country || '').toLowerCase();
  if (MAJOR_LEAGUES.some((l) => l.name.toLowerCase() === n && (!l.country || l.country.toLowerCase() === c))) return true;
  if (TOURNAMENT_KEYWORDS.some((k) => n.includes(k))) return true;
  return false;
}

// Nom seul pour les grandes compétitions connues (ou si le pays est
// manquant en base) — "Nom (Pays)" pour les autres, afin de désambiguïser
// les championnats moins connus (ex. "First League (Arménie)").
export function competitionLabel(competition) {
  if (!competition?.name) return '';
  if (!competition.country || isMajorCompetition(competition.name, competition.country)) {
    return competition.name;
  }
  return `${competition.name} (${competition.country})`;
}

// Variante "décomposée" pour pouvoir styler le pays différemment du nom
// (couleur d'accent, pour qu'il attire l'œil sur les championnats peu
// connus). `country` vaut null pour les grandes compétitions — dans ce cas
// rien à afficher en plus du nom.
export function competitionLabelParts(competition) {
  if (!competition?.name) return { name: '', country: null };
  if (!competition.country || isMajorCompetition(competition.name, competition.country)) {
    return { name: competition.name, country: null };
  }
  return { name: competition.name, country: competition.country };
}
