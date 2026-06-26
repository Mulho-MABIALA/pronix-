import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <p className="text-8xl font-display font-bold text-primary-400">404</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-100">Page introuvable</h1>
      <p className="mt-2 text-gray-500 text-sm">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <div className="flex items-center justify-center gap-3 mt-8">
        <Link to="/" className="btn-primary">Retour à l'accueil</Link>
        <Link to="/matchs" className="btn-secondary">Voir les matchs</Link>
      </div>
    </div>
  );
}
