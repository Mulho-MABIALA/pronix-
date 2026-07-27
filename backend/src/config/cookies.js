// Centralise la configuration des cookies httpOnly d'authentification.
// Remplace le stockage des tokens JWT dans le localStorage du frontend
// (vulnérable au vol de session en cas de faille XSS) par des cookies
// httpOnly que le JavaScript côté navigateur ne peut pas lire.
const jwt = require('jsonwebtoken');
const env = require('./env');

const ACCESS_COOKIE = 'fp_at';
const REFRESH_COOKIE = 'fp_rt';
const isProd = env.NODE_ENV === 'production';

// Durée de vie du cookie d'access token = durée de vie réelle du JWT (exp),
// pour ne jamais désynchroniser cookie et token.
function accessCookieMaxAge(accessToken) {
  try {
    const decoded = jwt.decode(accessToken);
    if (decoded?.exp) return Math.max(decoded.exp * 1000 - Date.now(), 60 * 1000);
  } catch { /* fallback ci-dessous */ }
  return 15 * 60 * 1000; // 15 min par défaut
}

// Pose les deux cookies après login/register/refresh.
// - access token : path "/" (envoyé sur toutes les routes de l'API)
// - refresh token : path "/api/auth" uniquement (réduit la surface d'exposition,
//   n'est envoyé que sur /refresh-token et /logout)
function setAuthCookies(res, { accessToken, refreshToken, refreshExpiresAt }) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: accessCookieMaxAge(accessToken),
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: Math.max(refreshExpiresAt.getTime() - Date.now(), 0),
  });
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

module.exports = { ACCESS_COOKIE, REFRESH_COOKIE, setAuthCookies, clearAuthCookies };
