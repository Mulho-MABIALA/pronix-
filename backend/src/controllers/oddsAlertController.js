// Alertes cotes — "préviens-moi quand PSG > 2.0"
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { notifyUser } = require('./pushController');

// POST /api/odds-alerts
async function createAlert(req, res, next) {
  try {
    const { teamName, targetOdds, condition = 'above' } = req.body;

    if (!teamName?.trim()) throw new AppError('Nom d\'équipe requis', 400, 'MISSING_TEAM');
    if (!targetOdds || parseFloat(targetOdds) < 1.01 || parseFloat(targetOdds) > 50) {
      throw new AppError('Cote invalide (entre 1.01 et 50)', 400, 'INVALID_ODDS');
    }
    if (!['above', 'below'].includes(condition)) {
      throw new AppError('Condition invalide (above ou below)', 400, 'INVALID_CONDITION');
    }

    // Max 10 alertes actives par utilisateur
    const count = await prisma.oddsAlert.count({
      where: { userId: req.user.id, isActive: true },
    });
    if (count >= 10) {
      throw new AppError('Maximum 10 alertes actives autorisées', 400, 'MAX_ALERTS');
    }

    const alert = await prisma.oddsAlert.create({
      data: {
        userId: req.user.id,
        teamName: teamName.trim(),
        targetOdds: parseFloat(targetOdds),
        condition,
      },
    });

    res.status(201).json({ success: true, data: alert });
  } catch (err) { next(err); }
}

// GET /api/odds-alerts — mes alertes
async function listAlerts(req, res, next) {
  try {
    const alerts = await prisma.oddsAlert.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: alerts });
  } catch (err) { next(err); }
}

// DELETE /api/odds-alerts/:id
async function deleteAlert(req, res, next) {
  try {
    const alert = await prisma.oddsAlert.findUnique({ where: { id: req.params.id } });
    if (!alert) throw new AppError('Alerte introuvable', 404, 'NOT_FOUND');
    if (alert.userId !== req.user.id) throw new AppError('Non autorisé', 403, 'FORBIDDEN');

    await prisma.oddsAlert.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Alerte supprimée' });
  } catch (err) { next(err); }
}

// PATCH /api/odds-alerts/:id/toggle — activer/désactiver
async function toggleAlert(req, res, next) {
  try {
    const alert = await prisma.oddsAlert.findUnique({ where: { id: req.params.id } });
    if (!alert) throw new AppError('Alerte introuvable', 404, 'NOT_FOUND');
    if (alert.userId !== req.user.id) throw new AppError('Non autorisé', 403, 'FORBIDDEN');

    const updated = await prisma.oddsAlert.update({
      where: { id: req.params.id },
      data: { isActive: !alert.isActive },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

// Méthode interne — appelée par oddsService après chaque sync
// Vérifie toutes les alertes actives et envoie les notifications
async function checkAndTriggerAlerts(oddsData) {
  try {
    const activeAlerts = await prisma.oddsAlert.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { id: true, pushSubscriptions: true },
        },
      },
    });

    for (const alert of activeAlerts) {
      // Trouver les cotes correspondant au nom de l'équipe
      const matchingOdds = findOddsForTeam(oddsData, alert.teamName);
      if (!matchingOdds) continue;

      const triggered =
        (alert.condition === 'above' && matchingOdds >= alert.targetOdds) ||
        (alert.condition === 'below' && matchingOdds <= alert.targetOdds);

      if (triggered) {
        // Notifier l'utilisateur
        const condText = alert.condition === 'above' ? '>' : '<';
        await notifyUser(alert.userId, {
          title: `🔔 Alerte cote : ${alert.teamName}`,
          body: `La cote est maintenant ${matchingOdds.toFixed(2)} (${condText} ${alert.targetOdds})`,
          url: '/matchs',
          tag: `odds-alert-${alert.id}`,
        });

        // Désactiver l'alerte après déclenchement
        await prisma.oddsAlert.update({
          where: { id: alert.id },
          data: { isActive: false, triggeredAt: new Date() },
        });
      }
    }
  } catch (e) {
    console.error('[OddsAlert] Erreur vérification:', e.message);
  }
}

function findOddsForTeam(oddsData, teamName) {
  if (!Array.isArray(oddsData)) return null;
  const lower = teamName.toLowerCase();
  for (const match of oddsData) {
    if (match.home_team?.toLowerCase().includes(lower)) return match.odds?.h2h?.[0] || null;
    if (match.away_team?.toLowerCase().includes(lower)) return match.odds?.h2h?.[2] || null;
  }
  return null;
}

module.exports = { createAlert, listAlerts, deleteAlert, toggleAlert, checkAndTriggerAlerts };
