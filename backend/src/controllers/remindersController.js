const { z } = require('zod');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// GET /api/reminders  — tous les rappels de l'utilisateur (futurs)
async function getReminders(req, res, next) {
  try {
    const reminders = await prisma.matchReminder.findMany({
      where: {
        userId: req.user.id,
        sent: false,
        match: { scheduledAt: { gt: new Date() } },
      },
      include: {
        match: { include: { competition: true } },
      },
      orderBy: { match: { scheduledAt: 'asc' } },
    });

    res.json({ success: true, data: reminders });
  } catch (err) {
    next(err);
  }
}

// POST /api/matches/:id/reminder  — créer/modifier un rappel
async function setReminder(req, res, next) {
  try {
    const matchId = req.params.id;
    const { minutesBefore } = z.object({
      minutesBefore: z.number().int().min(5).max(1440).default(60),
    }).parse(req.body);

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new AppError('Match introuvable', 404, 'NOT_FOUND');

    if (match.scheduledAt <= new Date()) {
      throw new AppError('Ce match est déjà commencé ou terminé', 400, 'MATCH_PAST');
    }

    const reminder = await prisma.matchReminder.upsert({
      where: { userId_matchId: { userId: req.user.id, matchId } },
      update: { minutesBefore, sent: false },
      create: { userId: req.user.id, matchId, minutesBefore },
      include: { match: { include: { competition: true } } },
    });

    res.status(201).json({ success: true, data: reminder });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/matches/:id/reminder  — supprimer un rappel
async function deleteReminder(req, res, next) {
  try {
    const matchId = req.params.id;

    const reminder = await prisma.matchReminder.findUnique({
      where: { userId_matchId: { userId: req.user.id, matchId } },
    });
    if (!reminder) throw new AppError('Rappel introuvable', 404, 'NOT_FOUND');

    await prisma.matchReminder.delete({
      where: { userId_matchId: { userId: req.user.id, matchId } },
    });

    res.json({ success: true, message: 'Rappel supprimé' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getReminders, setReminder, deleteReminder };
