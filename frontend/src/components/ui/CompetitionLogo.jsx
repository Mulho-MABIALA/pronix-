import { useState } from 'react';
import { Globe } from 'lucide-react';

/**
 * Logo officiel d'une compétition (API-Football) avec fallback icône Globe.
 * - `logo`  : URL du logo (peut être null)
 * - `size`  : taille en px (défaut 16)
 */
export default function CompetitionLogo({ logo, size = 16, className = '' }) {
  const [error, setError] = useState(false);

  if (!logo || error) {
    return <Globe size={size} className={`text-ink-4 shrink-0 ${className}`} />;
  }

  return (
    <img
      src={logo}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setError(true)}
      className={`shrink-0 object-contain drop-shadow-[0_0_1px_rgb(var(--overlay-rgb) / 0.4)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
