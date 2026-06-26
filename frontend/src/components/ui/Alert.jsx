import { CheckCircle2, AlertCircle, Info, X, Sparkles } from 'lucide-react';

const VARIANTS = {
  success: { icon: CheckCircle2, style: 'bg-primary-500/10 border-primary-500/25 text-primary-400' },
  error:   { icon: AlertCircle,  style: 'bg-red-500/10 border-red-500/25 text-red-400' },
  info:    { icon: Info,         style: 'bg-blue-500/10 border-blue-500/25 text-blue-400' },
  warning: { icon: AlertCircle,  style: 'bg-amber-500/10 border-amber-500/25 text-amber-400' },
  ai:      { icon: Sparkles,     style: 'bg-violet-500/10 border-violet-500/30 text-violet-400' },
};

/** Alerte unifiée (succès / erreur / info / avertissement) pour remplacer les divs colorés ad-hoc. */
export default function Alert({ variant = 'info', children, onClose, className = '' }) {
  const { icon: Icon, style } = VARIANTS[variant] || VARIANTS.info;
  return (
    <div role="alert" className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm animate-fade-in ${style} ${className}`}>
      <Icon size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1 leading-relaxed">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
