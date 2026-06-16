// Mention légale visible en permanence (jeu responsable)
export default function Disclaimer() {
  return (
    <footer className="bg-surface-800 border-t border-surface-700 py-3 px-4 text-center hidden md:block">
      <p className="disclaimer">
        Statistique Foot fournit des données et statistiques à titre informatif uniquement.{' '}
        <strong>Ceci n'est pas un conseil financier. Aucune garantie de gain n'est promise.</strong>{' '}
        Jouez de manière responsable. 18+ uniquement.{' '}
        <a href="/cgu" className="underline hover:text-gray-300">CGU</a>
      </p>
    </footer>
  );
}
