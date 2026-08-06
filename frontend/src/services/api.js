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
    if (error.response?.status === 401 && RETRYABLE_CODES.includes(error.response?.data?.code) && !original._retry) {
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
        window.location.href = '/connexion';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
