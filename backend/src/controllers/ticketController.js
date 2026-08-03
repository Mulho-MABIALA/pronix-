// Tickets sauvegardés (générateur de pronostics) — enregistrement + historique.
// Réutilise le modèle TipCombo/TipComboEntry (créé pour l'ancienne feature
// "Combinés publics", retirée du produit mais dont la table est restée en base :
// c'est exactement la structure qu'il faut ici, aucune migration nécessaire.
const { z } = require('zod');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { resolvePick } = require('../utils/pickResult');
const { getUserPlanCode } = require('../middleware/subscription');

const MAX_ENTRIES = 20;
const FREE_TICKET_DAILY_LIMIT = 3;

const ticketEntrySchema = z.object({
  matchId: z.string().uuid({ message: 'Sélection invalide' }),
  prediction: z.string().min(1).max(100),
  odds: z.coerce.number().min(1).max(1000).optional().default(1),
});

const saveTicketSchema = z.object({
  entries: z.array(ticketEntrySchema).min(1, 'Le ticket doit contenir au moins une sélection').max(MAX_ENTRIES, `Maximum ${MAX_ENTRIES} sélections par ticket`),
  totalOdds: z.coerce.number().min(1).optional(),
  title: z.string().max(200).optional().nullable(),
  // Snapshot des réglages du générateur — simple passthrough JSON, la forme
  // exacte est un détail du frontend (Machine.jsx), pas contractuelle côté API.
  settings: z.record(z.any()).optional().nullable(),
});

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function isPremiumUser(user) {
  return ['PREMIUM', 'PRO', 'LIFETIME'].includes(getUserPlanCode(user));
}

// GET /api/tickets/quota — statut du quota (lecture seule, n'incrémente pas)
async function getTicketQuota(req, res, next) {
  try {
    if (isPremiumUser(req.user)) {
      return res.json({ success: true, data: { used: 0, limit: null, unlimited: true } });
    }
    const quota = await prisma.ticketQuota.findUnique({
      where: { userId_date: { userId: req.user.id, date: today() } },
    });
    res.json({
      success: true,
      data: { used: quota?.count || 0, limit: FREE_TICKET_DAILY_LIMIT, unlimited: false },
    });
  } catch (err) { next(err); }
}

// POST /api/tickets/quota/consume — vérifie et incrémente le quota journalier
// (appelé à chaque clic sur "Générer" côté frontend, avant de construire le ticket)
async function consumeTicketQuota(req, res, next) {
  try {
    if (isPremiumUser(req.user)) {
      return res.json({ success: true, data: { allowed: true, used: 0, limit: null, unlimited: true } });
    }

    const date = today();
    const quota = await prisma.ticketQuota.upsert({
      where:  { userId_date: { userId: req.user.id, date } },
      create: { userId: req.user.id, date, count: 1 },
      update: { count: { increment: 1 } },
    });

    if (quota.count > FREE_TICKET_DAILY_LIMIT) {
      await prisma.ticketQuota.update({
        where: { userId_date: { userId: req.user.id, date } },
        data:  { count: { decrement: 1 } },
      });
      return res.json({
        success: true,
        data: { allowed: false, used: FREE_TICKET_DAILY_LIMIT, limit: FREE_TICKET_DAILY_LIMIT, unlimited: false },
      });
    }

    res.json({
      success: true,
      data: { allowed: true, used: quota.count, limit: FREE_TICKET_DAILY_LIMIT, unlimited: false },
    });
  } catch (err) { next(err); }
}

// POST /api/tickets — enregistrer un ticket généré
async function saveTicket(req, res, next) {
  try {
    const { entries, totalOdds, title, settings } = saveTicketSchema.parse(req.body);

    const matchIds = [...new Set(entries.map((e) => e.matchId))];
    const existing = await prisma.match.findMany({
      where: { id: { in: matchIds } },
      select: { id: true },
    });
    if (existing.length !== matchIds.length) {
      throw new AppError('Un ou plusieurs matchs sont introuvables', 404, 'MATCH_NOT_FOUND');
    }

    const computedTotalOdds = entries.reduce((acc, e) => acc * e.odds, 1);
    const finalTotalOdds = totalOdds ?? computedTotalOdds;

    const combo = await prisma.tipCombo.create({
      data: {
        userId: req.user.id,
        title: title || null,
        totalOdds: Math.round(finalTotalOdds * 100) / 100,
        settings: settings || undefined,
        entries: {
          create: entries.map((e) => ({
            matchId: e.matchId,
            prediction: e.prediction,
            odds: e.odds,
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

    // Taux de réussite — calculé uniquement sur les tickets déjà résolus
    // (Gagné/Perdu), les tickets en attente ne comptent ni pour ni contre.
    const wonCount = data.filter((c) => c.result === 'WON').length;
    const lostCount = data.filter((c) => c.result === 'LOST').length;
    const pendingCount = data.filter((c) => c.result === 'PENDING').length;
    const resolvedCount = wonCount + lostCount;
    const winRate = resolvedCount > 0 ? Math.round((wonCount / resolvedCount) * 1000) / 10 : null;

    res.json({
      success: true,
      data,
      stats: {
        total: data.length,
        won: wonCount,
        lost: lostCount,
        pending: pendingCount,
        resolved: resolvedCount,
        winRate,
      },
    });
  } catch (err) { next(err); }
}

// GET /api/tickets/last — dernier ticket sauvegardé (settings uniquement,
// pas d'include match) : sert au raccourci "Refaire comme hier" sur la home,
// volontairement léger pour ne pas répéter la requête lourde de /history
// à chaque visite de la home d'un utilisateur connecté.
async function getLastTicketSettings(req, res, next) {
  try {
    const combo = await prisma.tipCombo.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, settings: true },
    });
    res.json({ success: true, data: combo && combo.settings ? combo : null });
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

module.exports = { saveTicket, getTicketHistory, getLastTicketSettings, deleteTicket, getTicketQuota, consumeTicketQuota };
