// Skeleton loaders — performance perçue pendant le chargement des données
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bento-card space-y-3 ${className}`} aria-hidden="true">
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
    </div>
  );
}

export function SkeletonMatchCard() {
  return (
    <div className="bento-card" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="skeleton h-10 w-10 rounded-full" />
          <div className="skeleton h-4 w-28 rounded" />
        </div>
        <div className="skeleton h-8 w-16 rounded-lg" />
        <div className="flex items-center gap-3">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-10 w-10 rounded-full" />
        </div>
      </div>
      <div className="mt-3 skeleton h-3 w-32 rounded" />
    </div>
  );
}

export function SkeletonTipsterRow() {
  return (
    <div className="flex items-center gap-4 p-4 bento-card" aria-hidden="true">
      <div className="skeleton h-8 w-8 rounded-full" />
      <div className="skeleton h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
      <div className="skeleton h-8 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton h-3 rounded ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  );
}
