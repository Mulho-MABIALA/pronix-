import { Zap } from 'lucide-react';
import { formatOdd, formatEdge } from '../../utils/mockOdds';

/**
 * Cote (simulée) affichée sous forme de petit chip — ex: "2.10".
 * Les cotes sont générées côté client à titre indicatif (voir utils/mockOdds.js).
 */
export function OddsChip({ odd, size = 'sm', muted = false, className = '' }) {
  if (!odd) return null;
  const sizing = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-1.5 py-0.5 text-[11px]';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border font-mono font-semibold tabular-nums
        ${muted ? 'border-white/[0.06] bg-white/[0.02] text-gray-500' : 'border-white/[0.08] bg-white/[0.04] text-gray-200'}
        ${sizing} ${className}`}
      title="Cote simulée — donnée indicative"
    >
      {formatOdd(odd)}
    </span>
  );
}

/** Badge "Value Bet" — signale une cote dont l'avantage estimé dépasse le seuil interne. */
export function ValueBetBadge({ edge, size = 'sm', showEdge = false, className = '' }) {
  return (
    <span
      className={`badge bg-amber-500/15 text-amber-400 border border-amber-500/25
        ${size === 'md' ? 'text-xs px-2.5 py-1' : ''} ${className}`}
      title="Value bet simulée — l'avantage estimé est calculé sur des cotes indicatives"
    >
      <Zap size={10} className="shrink-0" />
      Value{showEdge && edge != null ? ` ${formatEdge(edge)}` : ''}
    </span>
  );
}

export default OddsChip;
