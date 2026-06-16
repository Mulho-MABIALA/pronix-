const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = Router();
router.use(authenticate);

// Mise à jour du profil
router.patch('/me', async (req, res, next) => {
  try {
    const schema = z.object({
      displayName: z.string().max(50).optional(),
      bio: z.string().max(300).optional(),
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
    });
    const { favoriteTeams, favoriteLeagues } = schema.parse(req.body);

    const profile = await prisma.profile.update({
      where: { userId: req.user.id },
      data: { favoriteTeams, favoriteLeagues, onboardingDone: true },
    });
    res.json({ success: true, data: profile });
  } catch (err) {
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
