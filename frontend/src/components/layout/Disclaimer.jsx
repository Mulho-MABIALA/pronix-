export default function Disclaimer() {
  return (
    <footer className="bg-surface-800 border-t border-surface-700 py-4 px-4 hidden md:block">
      <div className="max-w-6xl mx-auto space-y-2">
        <p className="disclaimer text-center">
          Pronix fournit des données et statistiques à titre informatif uniquement.{' '}
          <strong>Ceci n'est pas un conseil financier. Aucune garantie de gain n'est promise.</strong>{' '}
          Jouez de manière responsable. 18+ uniquement.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
          <a href="/cgu" className="hover:text-gray-400 transition-colors">CGU</a>
          <span aria-hidden="true">·</span>
          <a href="/politique-confidentialite" className="hover:text-gray-400 transition-colors">Politique de confidentialité</a>
          <span aria-hidden="true">·</span>
          <a href="/faq" className="hover:text-gray-400 transition-colors">FAQ</a>
          <span aria-hidden="true">·</span>
          <a href="mailto:contact@pronix.sn" className="hover:text-gray-400 transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
