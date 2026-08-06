/**
 * usePWAInstall — hook partagé pour le bouton "Installer l'app".
 * Capture beforeinstallprompt au niveau module (avant que les composants montent)
 * et notifie tous les composants abonnés.
 */

import { useState, useEffect } from 'react';
import api from '../services/api';

// Module-level : survit aux remontages de composants
let _deferredPrompt = null;
const _listeners = new Set();

function notify() {
  _listeners.forEach((fn) => fn(_deferredPrompt));
}

// Clé de throttle — date (YYYY-MM-DD) du dernier signalement, pas un simple
// flag "déjà fait une fois" : contrairement à un flag booléen, ça permet de
// re-signaler après une désinstallation/réinstallation (même si le
// localStorage du navigateur a survécu à l'opération) et ça garde
// appInstalledAt "vivant" tant que l'app installée est réellement utilisée.
const LAST_REPORT_KEY = 'fpronix_app_installed_last_report';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

// Signale au serveur que l'app est installée — au maximum 1x/jour, si
// connecté. Le token d'auth vit maintenant dans un cookie httpOnly illisible
// en JS : on ne peut plus vérifier la connexion ici, on tente l'appel et on
// ignore silencieusement le 401 si l'utilisateur n'est pas connecté.
function reportInstalled() {
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(LAST_REPORT_KEY) === today) return;
  api.post('/auth/app-installed')
    .then(() => localStorage.setItem(LAST_REPORT_KEY, today))
    .catch(() => {});
}

// Capture l'événement dès que possible (avant le premier render React)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    notify();
    reportInstalled();
  });

  // Cas iOS / installations existantes : pas d'event 'appinstalled',
  // on détecte le mode standalone au chargement.
  if (isStandalone()) reportInstalled();
}

export function usePWAInstall() {
  const [prompt, setPrompt] = useState(_deferredPrompt);

  useEffect(() => {
    // S'abonner aux mises à jour futures
    const listener = (p) => setPrompt(p);
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  }, []);

  const install = async () => {
    if (!prompt) return false;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      _deferredPrompt = null;
      notify();
    }
    return outcome === 'accepted';
  };

  return { isInstallable: !!prompt, install };
}
