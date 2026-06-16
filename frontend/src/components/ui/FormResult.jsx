// Indicateurs visuels de forme récente (W/D/L)
export default function FormResult({ results = [] }) {
  const styles = {
    W: 'bg-primary-500 text-white',
    D: 'bg-yellow-500 text-black',
    L: 'bg-red-500 text-white',
  };
  const labels = { W: 'Victoire', D: 'Nul', L: 'Défaite' };

  return (
    <div className="flex items-center gap-1" aria-label="Forme récente">
      {results.slice(-5).map((r, i) => (
        <span
          key={i}
          className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${styles[r] || 'bg-surface-600 text-gray-400'}`}
          title={labels[r] || r}
          aria-label={labels[r] || r}
        >
          {r}
        </span>
      ))}
    </div>
  );
}
