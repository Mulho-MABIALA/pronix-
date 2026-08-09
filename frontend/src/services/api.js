import axios from 'axios';

// Nettoyage : anciens tokens JWT stockés en localStorage avant la migration
// vers les cookies httpOnly — ils ne servent plus à rien, on les efface.
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  // Authentification par cookies httpOnly (access + refresh token) — le
  // navigateur les envoie/reçoit automatiquement, plus besoin d'en-tête
  // Authorization ni de stockage en localStorage (protège contre le vol
  // de session en cas de faille XSS ailleurs sur le site).
  withCredentials: true,
});

// Mémorise si une session a déjà été active dans cet onglet (mis à jour par
// AuthContext). Sert à distinguer "visiteur jamais connecté" (échec 401
// normal et silencieux sur /auth/me au chargement — ne doit RIEN déclencher)
// de "session qui vient d'expirer en cours d'usage" (là, la redirection vers
// /connexion a du sens). Sans cette distinction, TOUT visiteur anonyme était
// renvoyé de force vers /connexion dès l'arrivée sur le site.
let hasActiveSession = false;
export function setHasSession(value) {
  hasActiveSession = value;
}

// Gestion du token expiré — tentative de refresh automatique via le cookie
// httpOnly (le serveur pose de nouveaux cookies dans la réponse).
let isRefreshing = false;
let failedQueue = [];

function processQueue(error) {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve()));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // TOKEN_EXPIRED : le JWT a expiré mais le cookie était encore présent.
    // UNAUTHORIZED : cas le plus fréquent en pratique — le cookie d'access
    // token a une durée de vie calée pile sur l'expiration du JWT (voir
    // accessCookieMaxAge côté backend), donc le navigateur supprime déjà le
    // cookie lui-même avant la requête suivante ; le token n'est alors plus
    // "expiré", il est "absent", et le serveur répond UNAUTHORIZED. Sans ce
    // deuxième code, la session ne se renouvelait plus jamais après 15 min
    // d'inactivité (symptôme observé : l'app "se déconnecte" silencieusement).
    const RETRYABLE_CODES = ['TOKEN_EXPIRED', 'UNAUTHORIZED'];
    // Ne jamais déclencher ce mécanisme pour les routes /auth/* elles-mêmes
    // (login, register, me, refresh-token...) — leurs échecs sont déjà gérés
    // explicitement par AuthContext/Login.jsx. Sans cette exclusion, le simple
    // check silencieux "/auth/me" au chargement de l'app (qui échoue
    // normalement pour tout visiteur non connecté) déclenchait une tentative
    // de refresh puis une redirection forcée vers /connexion.
    const isAuthRoute = original?.url?.includes('/auth/');
    if (!isAuthRoute && error.response?.status === 401 && RETRYABLE_CODES.includes(error.response?.data?.code) && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(original));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${API_BASE}/auth/refresh-token`, {}, { withCredentials: true });
        processQueue(null);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError);
        // Ne redirige que si une session était réellement active (elle vient
        // d'expirer en cours d'usage) — pas pour un visiteur jamais connecté,
        // dont l'appel initial échoue simplement parce qu'il n'a pas de session.
        if (hasActiveSession) window.location.href = '/connexion';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
