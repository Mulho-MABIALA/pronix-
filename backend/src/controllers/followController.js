// Follow tipster — système gratuit (voir picks publics sans payer)
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// POST /api/follows/:tipsterId — follow
async function follow(req, res, next) {
  try {
    const { tipsterId } = req.params;
    if (tipsterId === req.user.id) {
      throw new AppError('Impossible de vous follow vous-même', 400, 'SELF_FOLLOW');
    }

    const tipster = await prisma.user.findUnique({
      where: { id: tipsterId },
      select: { id: true, username: true },
    });
    if (!tipster) throw new AppError('Tipster introuvable', 404, 'NOT_FOUND');

    const existing = await prisma.tipsterFollow.findUnique({
      where: { followerId_tipsterId: { followerId: req.user.id, tipsterId } },
    });
    if (existing) {
      return res.json({ success: true, message: 'Déjà suivi', following: true });
    }

    await prisma.tipsterFollow.create({
      data: { followerId: req.user.id, tipsterId },
    });

    res.json({ success: true, message: `Vous suivez maintenant ${tipster.username}`, following: true });
  } catch (err) { next(err); }
}

// DELETE /api/follows/:tipsterId — unfollow
async function unfollow(req, res, next) {
  try {
    const { tipsterId } = req.params;
    await prisma.tipsterFollow.deleteMany({
      where: { followerId: req.user.id, tipsterId },
    });
    res.json({ success: true, message: 'Vous ne suivez plus ce tipster', following: false });
  } catch (err) { next(err); }
}

// GET /api/follows/:tipsterId/status — est-ce que je suis ce tipster ?
async function checkFollow(req, res, next) {
  try {
    if (!req.user) return res.json({ success: true, following: false });

    const follow = await prisma.tipsterFollow.findUnique({
      where: {
        followerId_tipsterId: {
          followerId: req.user.id,
          tipsterId: req.params.tipsterId,
        },
      },
    });
    res.json({ success: true, following: !!follow });
  } catch (err) { next(err); }
}

// GET /api/follows/following — liste des tipsters que je suis
async function listFollowing(req, res, next) {
  try {
    const follows = await prisma.tipsterFollow.findMany({
      where: { followerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        tipster: {
          select: {
            id: true, username: true,
            profile: { select: { displayName: true, avatar: true } },
            tipsterStats: { select: { successRate: true, totalTips: true, globalRank: true } },
          },
        },
      },
    });

    res.json({ success: true, data: follows.map((f) => f.tipster) });
  } catch (err) { next(err); }
}

// GET /api/follows/followers/:tipsterId — combien de followers a ce tipster
async function getFollowerCount(req, res, next) {
  try {
    const count = await prisma.tipsterFollow.count({
      where: { tipsterId: req.params.tipsterId },
    });
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
}

module.exports = { follow, unfollow, checkFollow, listFollowing, getFollowerCount };
