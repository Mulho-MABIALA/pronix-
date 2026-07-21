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

const INSTALLED_FLAG = 'fpronix_app_installed_reported';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

// Signale au serveur que l'app est installée (une seule fois, si connecté)
function reportInstalled() {
  if (localStorage.getItem(INSTALLED_FLAG)) return;
  if (!localStorage.getItem('accessToken')) return;
  api.post('/auth/app-installed')
    .then(() => localStorage.setItem(INSTALLED_FLAG, '1'))
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
