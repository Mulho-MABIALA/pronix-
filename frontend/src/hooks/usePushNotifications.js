import { useState, useEffect } from 'react';
import api from '../services/api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// ─── Suivi local de la dernière souscription connue ───────────────────────────
// Sert à détecter une désactivation faite EN DEHORS de l'app (réglages du
// téléphone, désinstallation, changement de permission navigateur) : dans ce
// cas le navigateur invalide silencieusement la souscription sans jamais
// prévenir notre backend, qui garderait sinon une ligne "morte" en base.
const STORAGE_KEY = 'fpronix_push_endpoint';

function getStoredEndpoint() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function setStoredEndpoint(endpoint) {
  try {
    if (endpoint) localStorage.setItem(STORAGE_KEY, endpoint);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* noop */ }
}
async function cleanupStaleEndpoint(endpoint) {
  try { await api.post('/push/unsubscribe', { endpoint }); } catch { /* noop */ }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Envoie la souscription existante au backend (pour la lier à un userId)
async function syncExistingSubscription() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api.post('/push/subscribe', { subscription: sub.toJSON() });
      setStoredEndpoint(sub.endpoint);
    }
  } catch {}
}

export function usePushNotifications(user) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
    setSupported(ok);
    if (ok) checkSubscription();
  }, []);

  // Quand l'utilisateur se connecte → re-synchronise pour lier le userId
  useEffect(() => {
    if (user?.id) {
      syncExistingSubscription();
    }
  }, [user?.id]);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setStoredEndpoint(sub.endpoint);
        setSubscribed(true);
      } else {
        // Aucune souscription active côté navigateur. Si on en avait une avant
        // (désactivée hors de l'app — réglages OS, désinstallation, permission
        // revenue à "denied"), on prévient le backend pour supprimer la ligne
        // au lieu d'attendre qu'un envoi échoue.
        const stale = getStoredEndpoint();
        if (stale) {
          cleanupStaleEndpoint(stale);
          setStoredEndpoint(null);
        }
        setSubscribed(false);
      }
    } catch {}
  }

  async function registerSW() {
    const existing = await navigator.serviceWorker.getRegistration('/sw.js');
    if (existing) return existing;
    return navigator.serviceWorker.register('/sw.js');
  }

  async function subscribe() {
    if (!supported || loading) return;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const reg = await registerSW();
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await api.post('/push/subscribe', { subscription: sub.toJSON() });
      setStoredEndpoint(sub.endpoint);
      setSubscribed(true);
    } catch (err) {
      console.error('[Push] Erreur lors de la souscription:', err);
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    if (!supported || loading) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post('/push/unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setStoredEndpoint(null);
      setSubscribed(false);
    } catch (err) {
      console.error('[Push] Erreur lors du désabonnement:', err);
    } finally {
      setLoading(false);
    }
  }

  return { supported, subscribed, loading, subscribe, unsubscribe };
}
