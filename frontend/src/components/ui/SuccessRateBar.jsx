// Visualisation du taux de réussite d'un tipster
export default function SuccessRateBar({ rate = 0, total = 0, size = 'md', stacked = false }) {
  const pct = Math.round(rate);
  const color = pct >= 65 ? 'bg-primary-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  const textSize = size === 'lg' ? 'text-3xl font-display' : size === 'sm' ? 'text-sm' : 'text-xl font-semibold';

  return (
    <div className="space-y-1.5 min-w-0">
      <div className={`flex ${stacked ? 'flex-col items-end gap-0' : 'items-end justify-between'} min-w-0`}>
        <span className={`${textSize} text-gray-100 shrink-0`}>{pct}%</span>
        {total > 0 && (
          <span className="text-[10px] text-gray-500 whitespace-nowrap shrink-0">{total} pronos</span>
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
