import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n'; // Initialise i18next avant le rendu de l'app
import App from './App';

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
