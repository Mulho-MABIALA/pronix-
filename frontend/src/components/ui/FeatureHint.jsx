import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { hasSeenHint, markHintSeen } from '../../utils/featureDiscovery';

/**
 * Callout de découverte progressive — révèle une fonctionnalité avancée
 * (Coach IA, Comparateur...) au bon moment d'usage plutôt qu'à l'inscription.
 * Ne s'affiche qu'une seule fois par utilisateur (localStorage) : une fois
 * vu ou fermé, `hintKey` ne redéclenche plus jamais ce callout.
 */
export default function FeatureHint({ hintKey, icon: Icon, title, description, to, ctaLabel, color = 'primary' }) {
  const [dismissed, setDismissed] = useState(() => hasSeenHint(hintKey));

  if (dismissed) return null;

  function dismiss() {
    markHintSeen(hintKey);
    setDismissed(true);
  }

  const THEMES = {
    primary: { bg: 'bg-primary-500/10', border: 'border-primary-500/25', icon: 'text-primary-400', cta: 'text-primary-400 hover:text-primary-300' },
    pink:    { bg: 'bg-pink-500/10',    border: 'border-pink-500/25',    icon: 'text-pink-400',    cta: 'text-pink-400 hover:text-pink-300' },
    fuchsia: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/25', icon: 'text-fuchsia-400', cta: 'text-fuchsia-400 hover:text-fuchsia-300' },
  };
  const THEME = THEMES[color] || THEMES.primary;

  return (
    <div className={`relative flex items-start gap-3 rounded-xl border ${THEME.border} ${THEME.bg} p-3 animate-fade-in`}>
      {Icon && <Icon size={18} className={`${THEME.icon} shrink-0 mt-0.5`} />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-1 mb-0.5">{title}</p>
        <p className="text-xs text-ink-3 leading-relaxed mb-2">{description}</p>
        <Link
          to={to}
          onClick={dismiss}
          className={`inline-flex items-center gap-1 text-xs font-semibold ${THEME.cta} transition-colors`}
        >
          {ctaLabel} <ChevronRight size={12} />
        </Link>
      </div>
      <button
        onClick={dismiss}
        className="p-1 rounded-lg text-ink-4 hover:text-ink-2 hover:bg-overlay/[0.06] transition-colors shrink-0"
        aria-label="Fermer"
      >
        <X size={14} />
      </button>
    </div>
  );
}
