const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/database');
const { AppError } = require('./errorHandler');
const { ACCESS_COOKIE } = require('../config/cookies');

// Lit le token depuis le cookie httpOnly (mode normal) ou, à défaut,
// depuis l'en-tête Authorization (compat. clients externes / API directe).
function extractToken(req) {
  if (req.cookies?.[ACCESS_COOKIE]) return req.cookies[ACCESS_COOKIE];
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

// Vérifie le JWT access token et attache l'utilisateur à req
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError('Token d\'authentification manquant', 401, 'UNAUTHORIZED');
    }

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        throw new AppError('Token expiré', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('Token invalide', 401, 'INVALID_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        profile: true,
        subscription: { include: { plan: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Compte introuvable ou désactivé', 401, 'UNAUTHORIZED');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Vérifie que l'utilisateur est admin
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return next(new AppError('Accès réservé aux administrateurs', 403, 'FORBIDDEN'));
  }
  next();
}

// Jeu responsable : bloque les actions de pari/paiement tant que l'utilisateur
// est en pause auto-imposée (voir POST /profiles/me/self-exclusion). À placer
// après `authenticate` sur les routes concernées (génération de tickets,
// initiation de paiement) — jamais sur les routes de simple lecture.
function blockIfSelfExcluded(req, res, next) {
  const until = req.user?.selfExclusionUntil;
  if (until && new Date(until) > new Date()) {
    return next(new AppError(
      `Pause active jusqu'au ${new Date(until).toLocaleDateString('fr-FR')}. Cette action est bloquée pendant ta pause.`,
      403,
      'SELF_EXCLUDED',
    ));
  }
  next();
}

// Auth optionnelle : lit le token si présent, ne bloque pas si absent
async function optionalAuthenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return next();
    let payload;
    try { payload = jwt.verify(token, env.JWT_ACCESS_SECRET); } catch { return next(); }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true },
    });
    if (user?.isActive) req.user = user;
  } catch {}
  next();
}

module.exports = { authenticate, requireAdmin, optionalAuthenticate, blockIfSelfExcluded };
