const { Router } = require('express');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { REFRESH_COOKIE, clearAuthCookies } = require('../config/cookies');
const { notifyAdmin } = require('../services/adminNotificationService');

const router = Router();
router.use(authenticate);

// Mise à jour du profil
router.patch('/me', async (req, res, next) => {
  try {
    const schema = z.object({
      displayName: z.string().max(50).optional(),
      bio: z.string().max(300).optional(),
      // avatar : URL externe (Google) ou data:image base64 (upload local, max ~180 KB)
      avatar: z.string().max(250000).optional().nullable(),
      favoriteTeams: z.array(z.string()).max(10).optional(),
      favoriteLeagues: z.array(z.string()).max(10).optional(),
      notifEmail: z.boolean().optional(),
      notifSms: z.boolean().optional(),
    });
    const data = schema.parse(req.body);

    const profile = await prisma.profile.update({
      where: { userId: req.user.id },
      data,
    });
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// Marquer l'onboarding comme terminé
router.post('/me/onboarding', async (req, res, next) => {
  try {
    const schema = z.object({
      favoriteTeams: z.array(z.string()).max(10).default([]),
      favoriteLeagues: z.array(z.string()).max(10).default([]),
      // Langue principale + devise préférée + pays choisis à l'onboarding (ciblage mondial)
      language: z.enum(['fr', 'en', 'es', 'pt']).optional(),
      currency: z.enum(['FCFA', 'EUR', 'USD', 'GBP', 'BRL', 'MXN', 'CAD', 'ZAR']).optional(),
      country:  z.string().min(2).max(10).optional(),
    });
    const { favoriteTeams, favoriteLeagues, language, currency, country } = schema.parse(req.body);

    const [profile] = await prisma.$transaction([
      prisma.profile.update({
        where: { userId: req.user.id },
        data: { favoriteTeams, favoriteLeagues, onboardingDone: true },
      }),
      prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(language && { language }),
          ...(currency && { currency }),
          ...(country && { country }),
        },
      }),
    ]);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// Préférences localisation (pays / langue / devise) — éditables depuis la page
// Profil, séparé de /me/onboarding qui touche aussi les favoris.
router.patch('/me/preferences', async (req, res, next) => {
  try {
    const schema = z.object({
      language: z.enum(['fr', 'en', 'es', 'pt']).optional(),
      currency: z.enum(['FCFA', 'EUR', 'USD', 'GBP', 'BRL', 'MXN', 'CAD', 'ZAR']).optional(),
      country:  z.string().min(2).max(10).optional(),
    });
    const { language, currency, country } = schema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(language && { language }),
        ...(currency && { currency }),
        ...(country && { country }),
      },
    });
    const { password: _, ...userSafe } = user;
    res.json({ success: true, data: userSafe });
  } catch (err) {
    next(err);
  }
});

// Suppression définitive du compte (self-service)
router.delete('/me', async (req, res, next) => {
  try {
    // Compte avec mot de passe (non-Google) : on exige le mot de passe actuel
    if (req.user.password) {
      const { password } = z.object({ password: z.string().min(1) }).parse(req.body || {});
      const isValid = await bcrypt.compare(password, req.user.password);
      if (!isValid) {
        throw new AppError('Mot de passe incorrect', 401, 'INVALID_PASSWORD');
      }
    }

    // On garde username/email avant suppression : plus rien à lire une fois le compte parti.
    const { username, email } = req.user;

    await prisma.user.delete({ where: { id: req.user.id } });

    notifyAdmin({
      type: 'ACCOUNT_DELETED',
      title: 'Compte supprimé',
      message: `${username} (${email}) a supprimé son compte lui-même.`,
      link: '/admin/utilisateurs',
    });

    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await prisma.refreshToken.deleteMany({ where: { token } });
    clearAuthCookies(res);

    res.json({ success: true, message: 'Compte supprimé définitivement' });
  } catch (err) {
    if (err.code === 'P2025') {
      return next(new AppError('Compte introuvable', 404, 'NOT_FOUND'));
    }
    const msg = (err.message || '').toLowerCase();
    const isRestrictViolation =
      err.code === 'P2003' || err.code === 'P2014' ||
      msg.includes('23001') || msg.includes('foreign key constraint') || msg.includes('violates restrict');
    if (isRestrictViolation) {
      return next(new AppError(
        "Suppression impossible : ton compte a des paiements ou signalements enregistrés (historique conservé pour raisons légales/comptables). Contacte le support pour une suppression manuelle.",
        409,
        'DELETE_BLOCKED'
      ));
    }
    next(err);
  }
});

// Gestion des favoris (équipe, ligue, tipster)
router.post('/me/favorites', async (req, res, next) => {
  try {
    const schema = z.object({
      type: z.enum(['team', 'league', 'tipster']),
      externalId: z.string(),
      name: z.string(),
      logo: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const fav = await prisma.favorite.upsert({
      where: { userId_type_externalId: { userId: req.user.id, type: data.type, externalId: data.externalId } },
      update: {},
      create: { userId: req.user.id, ...data },
    });
    res.json({ success: true, data: fav });
  } catch (err) {
    next(err);
  }
});

router.delete('/me/favorites/:type/:externalId', async (req, res, next) => {
  try {
    await prisma.favorite.deleteMany({
      where: { userId: req.user.id, type: req.params.type, externalId: req.params.externalId },
    });
    res.json({ success: true, message: 'Favori supprimé' });
  } catch (err) {
    next(err);
  }
});

router.get('/me/favorites', async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: favorites });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
