/**
 * usePWAInstall — hook partagé pour le bouton "Installer l'app".
 * Capture beforeinstallprompt au niveau module (avant que les composants montent)
 * et notifie tous les composants abonnés.
 */

import { useState, useEffect } from 'react';

// Module-level : survit aux remontages de composants
let _deferredPrompt = null;
const _listeners = new Set();

function notify() {
  _listeners.forEach((fn) => fn(_deferredPrompt));
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
  });
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
