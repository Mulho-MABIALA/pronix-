const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/database');
const { AppError } = require('./errorHandler');

// Vérifie le JWT access token et attache l'utilisateur à req
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Token d\'authentification manquant', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.slice(7);
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

module.exports = { authenticate, requireAdmin };
