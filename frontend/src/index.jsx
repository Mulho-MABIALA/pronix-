import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n'; // Initialise i18next avant le rendu de l'app
import App from './App';

// Suivi d'erreurs production — chargement différé (dynamic import) : le SDK
// Sentry (~60-90 Ko gzip avec le tracing) ne fait plus partie du chunk
// critique téléchargé avant le premier rendu, et n'est même pas récupéré du
// tout en dev/local (VITE_SENTRY_DSN vide) au lieu d'être bundlé inutilement.
if (import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      // Échantillonnage modéré — évite d'exploser le quota gratuit (5k/mois)
      // sur une app à fort trafic mobile tout en gardant une vraie visibilité.
      // Pas de Session Replay : ça enregistre l'écran des utilisateurs (implique
      // consentement RGPD à traiter séparément) et nécessite worker-src blob:
      // dans la CSP — hors scope du simple suivi d'erreurs demandé ici.
      tracesSampleRate: 0.1,
    });
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── Retrait de l'écran de chargement initial (voir index.html) ────────────
// Durée minimale d'affichage pour que le splash reste visible et lisible
// même quand l'app charge très vite (sinon il ne fait qu'un flash). On
// attend en plus deux frames après le montage pour être sûr que React a
// bien peint le premier contenu réel avant de faire disparaître le splash.
const SPLASH_MIN_MS = 900;
const splashStart = performance.now();
const splashEl = document.getElementById('splash');

if (splashEl) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const elapsed = performance.now() - splashStart;
      const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
      setTimeout(() => {
        splashEl.classList.add('splash-hide');
        setTimeout(() => splashEl.remove(), 550);
      }, wait);
    });
  });
}

// Enregistrement du service worker différé après le premier rendu — évite
// que le script bloque l'affichage initial (voir injectRegister:null dans
// vite.config.js).
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}
