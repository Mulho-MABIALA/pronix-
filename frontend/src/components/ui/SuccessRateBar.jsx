// Visualisation du taux de réussite d'un tipster
export default function SuccessRateBar({ rate = 0, total = 0, size = 'md' }) {
  const pct = Math.round(rate);
  const color = pct >= 65 ? 'bg-primary-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  const textSize = size === 'lg' ? 'text-3xl font-display' : size === 'sm' ? 'text-sm' : 'text-xl font-semibold';

  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between">
        <span className={`${textSize} text-gray-100`}>{pct}%</span>
        {total > 0 && (
          <span className="text-xs text-gray-500">{total} pronos</span>
        )}
      </div>
      <div className="h-2 w-full bg-surface-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
