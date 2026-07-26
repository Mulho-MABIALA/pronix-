// Tickets sauvegardés (générateur de pronostics) — enregistrement + historique.
// Réutilise le modèle TipCombo/TipComboEntry (créé pour l'ancienne feature
// "Combinés publics", retirée du produit mais dont la table est restée en base :
// c'est exactement la structure qu'il faut ici, aucune migration nécessaire.
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { resolvePick } = require('../utils/pickResult');

const MAX_ENTRIES = 20;

// POST /api/tickets — enregistrer un ticket généré
async function saveTicket(req, res, next) {
  try {
    const { entries, totalOdds, title } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      throw new AppError('Le ticket doit contenir au moins une sélection', 400, 'EMPTY_TICKET');
    }
    if (entries.length > MAX_ENTRIES) {
      throw new AppError(`Maximum ${MAX_ENTRIES} sélections par ticket`, 400, 'TICKET_TOO_LARGE');
    }
    for (const e of entries) {
      if (!e || typeof e.matchId !== 'string' || typeof e.prediction !== 'string') {
        throw new AppError('Sélection invalide', 400, 'INVALID_ENTRY');
      }
    }

    const matchIds = [...new Set(entries.map((e) => e.matchId))];
    const existing = await prisma.match.findMany({
      where: { id: { in: matchIds } },
      select: { id: true },
    });
    if (existing.length !== matchIds.length) {
      throw new AppError('Un ou plusieurs matchs sont introuvables', 404, 'MATCH_NOT_FOUND');
    }

    const computedTotalOdds = entries.reduce((acc, e) => acc * (parseFloat(e.odds) || 1), 1);
    const finalTotalOdds = Number.isFinite(parseFloat(totalOdds)) ? parseFloat(totalOdds) : computedTotalOdds;

    const combo = await prisma.tipCombo.create({
      data: {
        userId: req.user.id,
        title: title || null,
        totalOdds: Math.round(finalTotalOdds * 100) / 100,
        entries: {
          create: entries.map((e) => ({
            matchId: e.matchId,
            prediction: e.prediction,
            odds: parseFloat(e.odds) || 1,
          })),
        },
      },
      include: { entries: true },
    });

    res.status(201).json({ success: true, data: combo });
  } catch (err) { next(err); }
}

// GET /api/tickets/history — mes tickets enregistrés, avec résultat calculé en direct
async function getTicketHistory(req, res, next) {
  try {
    const combos = await prisma.tipCombo.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        entries: {
          include: {
            match: {
              select: {
                id: true, homeTeam: true, awayTeam: true,
                homeTeamLogo: true, awayTeamLogo: true,
                scheduledAt: true, status: true, homeScore: true, awayScore: true,
                competition: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const data = combos.map((combo) => {
      const entries = combo.entries.map((e) => {
        const m = e.match;
        const finished = m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null;
        const legResult = finished ? resolvePick(e.prediction, m.homeScore, m.awayScore) : null;
        return { ...e, legResult };
      });

      let result = 'PENDING';
      if (entries.some((e) => e.legResult === 'LOSS')) result = 'LOST';
      else if (entries.length > 0 && entries.every((e) => e.legResult === 'WIN' || e.legResult === 'VOID')) result = 'WON';

      return { ...combo, entries, result };
    });

    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// DELETE /api/tickets/:id
async function deleteTicket(req, res, next) {
  try {
    const combo = await prisma.tipCombo.findUnique({ where: { id: req.params.id } });
    if (!combo) throw new AppError('Ticket introuvable', 404, 'NOT_FOUND');
    if (combo.userId !== req.user.id) throw new AppError('Non autorisé', 403, 'FORBIDDEN');

    await prisma.tipCombo.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Ticket supprimé' });
  } catch (err) { next(err); }
}

module.exports = { saveTicket, getTicketHistory, deleteTicket };
