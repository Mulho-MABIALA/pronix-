const { z } = require('zod');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const favoriteSchema = z.object({
  type: z.enum(['team', 'league', 'tipster']),
  externalId: z.string().min(1),
  name: z.string().min(1),
  logo: z.string().url().optional().nullable(),
});

// GET /api/favorites
async function getFavorites(req, res, next) {
  try {
    const { type } = req.query;
    const where = { userId: req.user.id };
    if (type) where.type = type;

    const favorites = await prisma.favorite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: favorites });
  } catch (err) {
    next(err);
  }
}

// POST /api/favorites
async function addFavorite(req, res, next) {
  try {
    const data = favoriteSchema.parse(req.body);

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_type_externalId: {
          userId: req.user.id,
          type: data.type,
          externalId: data.externalId,
        },
      },
      update: { name: data.name, logo: data.logo },
      create: { ...data, userId: req.user.id },
    });

    res.status(201).json({ success: true, data: favorite });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/favorites/:id
async function removeFavorite(req, res, next) {
  try {
    const fav = await prisma.favorite.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!fav) throw new AppError('Favori introuvable', 404, 'NOT_FOUND');

    await prisma.favorite.delete({ where: { id: fav.id } });
    res.json({ success: true, message: 'Favori supprimé' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/favorites/by-ref  (supprimer via type+externalId)
async function removeFavoriteByRef(req, res, next) {
  try {
    const { type, externalId } = z.object({
      type: z.string(),
      externalId: z.string(),
    }).parse(req.body);

    await prisma.favorite.deleteMany({
      where: { userId: req.user.id, type, externalId },
    });

    res.json({ success: true, message: 'Favori supprimé' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getFavorites, addFavorite, removeFavorite, removeFavoriteByRef };
