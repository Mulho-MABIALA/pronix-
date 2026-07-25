const prisma = require('../config/database');

// Nombre de semaines affichées dans la tendance
const WEEKS = 12;
// Fenêtre glissante pour le recalcul des prédictions IA (non persistées historiquement)
const AI_WINDOW_DAYS = 90;

// Réplique côté serveur de la logique pickIsCorrect() de Pronostics.jsx (frontend)
// pour rester cohérent entre le calcul affiché sur la page et ce bilan public.
function pickIsCorrect(pt, h, a) {
  return (
    (pt === '1' && h > a) || (pt === 'X' && h === a) || (pt === '2' && a > h) ||
    (pt === '1X' && h >= a) || (pt === 'X2' && a >= h) ||
    (pt === 'over25' && h + a > 2.5) || (pt === 'over15' && h + a > 1.5) ||
    (pt === 'btts' && h > 0 && a > 0)
  );
}

// Lundi de la semaine ISO contenant `date` (UTC), au format YYYY-MM-DD
function isoWeekStart(date) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = dimanche
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// GET /transparency — bilan public de fiabilité de la plateforme (public, pas d'auth)
async function getTransparencyStats(req, res, next) {
  try {
    // ── 1. Tipsters (picks communautaires) — déjà agrégé par le cron de stats ──
    const tipsterTotals = await prisma.tipsterStats.aggregate({
      _sum: { totalTips: true, correctTips: true },
    });
    const totalTips = tipsterTotals._sum.totalTips || 0;
    const correctTips = tipsterTotals._sum.correctTips || 0;
    const tipsterOverallRate = totalTips > 0 ? Math.round((correctTips / totalTips) * 1000) / 10 : 0;

    const activeTipsters = await prisma.tipsterStats.count({ where: { totalTips: { gt: 0 } } });

    const since = new Date();
    since.setDate(since.getDate() - WEEKS * 7);

    const weeklyRaw = await prisma.tipsterWeeklyStats.groupBy({
      by: ['weekStart'],
      where: { weekStart: { gte: since } },
      _sum: { tips: true, correct: true },
      orderBy: { weekStart: 'asc' },
    });

    const tipsterWeekly = weeklyRaw.map((w) => {
      const tips = w._sum.tips || 0;
      const correct = w._sum.correct || 0;
      return {
        weekStart: w.weekStart,
        tips,
        correct,
        successRate: tips > 0 ? Math.round((correct / tips) * 1000) / 10 : 0,
      };
    });

    // ── 2. Prédictions IA (Machine à pronostics / Pronostics.jsx) — calculées à la volée ──
    // Pas de persistance historique du résultat des prédictions IA (voir Match.predictions),
    // donc on recalcule sur une fenêtre glissante plutôt que de lire une table pré-agrégée.
    const aiSince = new Date();
    aiSince.setDate(aiSince.getDate() - AI_WINDOW_DAYS);

    // Note : pas de filtre Prisma sur `predictions` (champ Json?) — la syntaxe
    // `NOT: { predictions: null }` n'est pas valide pour un champ Json dans ce
    // client Prisma (nécessite Prisma.DbNull/JsonNull). On filtre plutôt côté
    // JS ci-dessous (pickType manquant => ignoré), plus simple et sans risque.
    const finishedMatches = await prisma.match.findMany({
      where: {
        status: 'FINISHED',
        scheduledAt: { gte: aiSince },
        homeScore: { not: null },
        awayScore: { not: null },
      },
      select: { homeScore: true, awayScore: true, predictions: true, scheduledAt: true },
    });

    let aiTotal = 0;
    let aiCorrect = 0;
    const aiWeeklyMap = new Map();

    for (const m of finishedMatches) {
      const pickType = m.predictions?.bestPick?.type;
      if (!pickType || m.homeScore == null || m.awayScore == null) continue;

      aiTotal += 1;
      const correct = pickIsCorrect(pickType, m.homeScore, m.awayScore);
      if (correct) aiCorrect += 1;

      const wk = isoWeekStart(m.scheduledAt);
      const entry = aiWeeklyMap.get(wk) || { total: 0, correct: 0 };
      entry.total += 1;
      if (correct) entry.correct += 1;
      aiWeeklyMap.set(wk, entry);
    }

    const aiOverallRate = aiTotal > 0 ? Math.round((aiCorrect / aiTotal) * 1000) / 10 : 0;
    const aiWeekly = [...aiWeeklyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-WEEKS)
      .map(([weekStart, v]) => ({
        weekStart,
        tips: v.total,
        correct: v.correct,
        successRate: v.total > 0 ? Math.round((v.correct / v.total) * 1000) / 10 : 0,
      }));

    res.json({
      success: true,
      data: {
        tipsters: {
          totalPicks: totalTips,
          correctPicks: correctTips,
          successRate: tipsterOverallRate,
          activeTipsters,
          weekly: tipsterWeekly,
        },
        ai: {
          totalPicks: aiTotal,
          correctPicks: aiCorrect,
          successRate: aiOverallRate,
          periodDays: AI_WINDOW_DAYS,
          weekly: aiWeekly,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTransparencyStats };
