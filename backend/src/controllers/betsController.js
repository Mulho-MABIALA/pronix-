const { z } = require('zod');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const betSchema = z.object({
  matchId: z.string().uuid().optional().nullable(),
  teamA: z.string().min(1),
  teamB: z.string().min(1),
  prediction: z.string().min(1),
  odds: z.number().min(1),
  stake: z.number().int().min(1),
  result: z.enum(['WIN', 'LOSS', 'VOID']).optional().nullable(),
  matchDate: z.coerce.date(),
  notes: z.string().max(2000).optional().nullable(),
});

// GET /api/bets
async function getBets(req, res, next) {
  try {
    const { result, from, to } = req.query;
    const where = { userId: req.user.id };
    if (result) where.result = result;
    if (from || to) {
      where.matchDate = {};
      if (from) where.matchDate.gte = new Date(from);
      if (to) where.matchDate.lte = new Date(to);
    }

    const bets = await prisma.betEntry.findMany({
      where,
      include: {
        match: { include: { competition: true } },
      },
      orderBy: { matchDate: 'desc' },
    });

    // Statistiques ROI
    const settled = bets.filter((b) => b.result && b.result !== 'VOID');
    const won = settled.filter((b) => b.result === 'WIN');
    const totalStaked = settled.reduce((s, b) => s + b.stake, 0);
    const totalReturn = won.reduce((s, b) => s + b.stake * b.odds, 0);
    const roi = totalStaked > 0 ? ((totalReturn - totalStaked) / totalStaked) * 100 : 0;

    res.json({
      success: true,
      data: bets,
      stats: {
        total: bets.length,
        settled: settled.length,
        wins: won.length,
        losses: settled.filter((b) => b.result === 'LOSS').length,
        winRate: settled.length > 0 ? (won.length / settled.length) * 100 : 0,
        totalStaked,
        totalReturn,
        roi: Math.round(roi * 100) / 100,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/bets
async function createBet(req, res, next) {
  try {
    const data = betSchema.parse(req.body);

    // Vérifier que le matchId existe si fourni
    if (data.matchId) {
      const match = await prisma.match.findUnique({ where: { id: data.matchId } });
      if (!match) throw new AppError('Match introuvable', 404, 'NOT_FOUND');
    }

    const bet = await prisma.betEntry.create({
      data: { ...data, userId: req.user.id },
      include: { match: { include: { competition: true } } },
    });

    res.status(201).json({ success: true, data: bet });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/bets/:id
async function updateBet(req, res, next) {
  try {
    const existing = await prisma.betEntry.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) throw new AppError('Paris introuvable', 404, 'NOT_FOUND');

    const data = betSchema.partial().parse(req.body);
    const bet = await prisma.betEntry.update({
      where: { id: existing.id },
      data,
      include: { match: { include: { competition: true } } },
    });

    res.json({ success: true, data: bet });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/bets/:id
async function deleteBet(req, res, next) {
  try {
    const existing = await prisma.betEntry.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) throw new AppError('Paris introuvable', 404, 'NOT_FOUND');

    await prisma.betEntry.delete({ where: { id: existing.id } });
    res.json({ success: true, message: 'Paris supprimé' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBets, createBet, updateBet, deleteBet };
