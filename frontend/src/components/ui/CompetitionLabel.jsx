import { competitionLabelParts } from '../../utils/competitionLabel';

// Nom de compétition + pays mis en couleur pour les championnats moins
// connus (ex. "First League" en Arménie) — le pays attire l'œil pour lever
// l'ambiguïté, contrairement au nom qui reste dans la couleur de base.
export default function CompetitionLabel({ competition, className = '' }) {
  const { name, country } = competitionLabelParts(competition);
  return (
    <span className={className}>
      {name}
      {country && <span className="text-select-400 font-semibold"> ({country})</span>}
    </span>
  );
}
