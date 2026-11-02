import { Component } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

// ─── Filet de sécurité global : plus jamais d'écran blanc ─────────────────────
// Si un composant plante pendant l'affichage, React démonte toute l'app et
// l'utilisateur voit une page blanche. Ce composant intercepte l'erreur et
// affiche une page « Oups » avec Recharger / Accueil. L'erreur est envoyée à
// Sentry s'il est configuré.
//
// Cas particulier : après un déploiement, un onglet resté ouvert peut
// demander un morceau de l'ancienne version qui n'existe plus (« chunk »).
// On recharge alors la page automatiquement, une seule fois, pour récupérer
// la nouvelle version — l'utilisateur ne voit rien.

export function isChunkLoadError(error) {
  const msg = String(error?.message || error || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk .* failed/i.test(msg);
}

const RELOAD_FLAG = 'fpronix:chunk-reload';

export function reloadOnceForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
    if (Date.now() - last < 30000) return false; // déjà rechargé il y a peu : on n'insiste pas
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch { /* stockage indisponible */ }
  window.location.reload();
  return true;
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  // resetKey (ex. l'adresse de la page) : quand il change, on retente
  // l'affichage — un plantage sur une page ne bloque pas la navigation.
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error, info) {
    if (isChunkLoadError(error) && reloadOnceForNewVersion()) return;
    console.error('[ErrorBoundary]', error, info?.componentStack);
    if (import.meta.env.VITE_SENTRY_DSN) {
      import('@sentry/react')
        .then((Sentry) => Sentry.captureException(error, { extra: { componentStack: info?.componentStack } }))
        .catch(() => {});
    }
  }

  render() {
    if (this.state.error) return <CrashScreen chunk={isChunkLoadError(this.state.error)} />;
    return this.props.children;
  }
}

function CrashScreen({ chunk }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-md w-full text-center space-y-5">
        <img src="/logo-circle.png" alt="fpronix" className="w-16 h-16 rounded-full mx-auto" />
        <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <h1 className="font-display font-bold text-2xl text-ink-1">
          {chunk ? t('errors.updateTitle') : t('errors.crashTitle')}
        </h1>
        <p className="text-ink-3 text-sm leading-relaxed">
          {chunk ? t('errors.updateDesc') : t('errors.crashDesc')}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => window.location.reload()} className="btn-primary inline-flex items-center gap-2">
            <RefreshCw size={14} /> {t('errors.reload')}
          </button>
          {/* Lien natif (pas <Link>) : le routeur peut lui-même être en panne */}
          <a href="/" className="btn-secondary inline-flex items-center gap-2">
            <Home size={14} /> {t('errors.backHome')}
          </a>
        </div>
      </div>
    </div>
  );
}
