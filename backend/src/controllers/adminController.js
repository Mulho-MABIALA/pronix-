const { z } = require('zod');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { calculatePredictionsForDate } = require('../services/predictionService');
const { syncMatchesForDate } = require('../cron/syncMatches');

// ─── Tableau de bord ──────────────────────────────────────────────────────────
async function getDashboard(req, res, next) {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      activeSubscriptions,
      monthlyRevenue,
      lastMonthRevenue,
      totalRevenue,
      recentUsers,
      pendingReports,
      totalMatches,
      totalTips,
      churnCount,
      planDistribution,
      topTipsters,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'USER', createdAt: { gte: firstDayOfMonth } } }),
      prisma.user.count({ where: { role: 'USER', createdAt: { gte: firstDayLastMonth, lt: firstDayOfMonth } } }),
      prisma.subscription.count({ where: { status: 'ACTIVE', plan: { code: { not: 'FREE' } } } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: firstDayOfMonth } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: firstDayLastMonth, lt: firstDayOfMonth } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.user.findMany({
        where: { role: 'USER' },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { profile: true, subscription: { include: { plan: true } } },
      }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.match.count(),
      prisma.tip.count(),
      prisma.subscription.count({ where: { status: 'EXPIRED', updatedAt: { gte: firstDayOfMonth } } }),
      prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: 'ACTIVE' },
        _count: true,
        // We'll join with plan names below
      }),
      prisma.tipsterStats.findMany({
        where: { totalTips: { gte: 5 } },
        orderBy: { successRate: 'desc' },
        take: 5,
        include: { user: { include: { profile: true } } },
      }),
    ]);

    // Revenus des 6 derniers mois
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dNext = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const agg = await prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: d, lt: dNext } },
        _sum: { amount: true },
      });
      revenueByMonth.push({
        month: d.toLocaleString('fr-FR', { month: 'short' }),
        amount: agg._sum.amount || 0,
      });
    }

    // Distribution des plans avec noms
    const plans = await prisma.plan.findMany({ select: { id: true, code: true } });
    const planMap = Object.fromEntries(plans.map(p => [p.id, p.code]));
    const planDist = {};
    for (const group of planDistribution) {
      const code = planMap[group.planId] || 'UNKNOWN';
      planDist[code] = group._count;
    }

    const prevRevenue = lastMonthRevenue._sum.amount || 0;
    const currRevenue = monthlyRevenue._sum.amount || 0;
    const revenueGrowth = prevRevenue > 0
      ? Math.round(((currRevenue - prevRevenue) / prevRevenue) * 100)
      : null;

    const userGrowth = newUsersLastMonth > 0
      ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
      : null;

    res.json({
      success: true,
      data: {
        kpis: {
          totalUsers,
          newUsersThisMonth,
          userGrowth,
          activeSubscriptions,
          monthlyRevenue: currRevenue,
          revenueGrowth,
          totalRevenue: totalRevenue._sum.amount || 0,
          churnThisMonth: churnCount,
          pendingReports,
          totalMatches,
          totalTips,
        },
        revenueByMonth,
        planDistribution: planDist,
        topTipsters: topTipsters.map(t => ({
          id: t.userId,
          displayName: t.user.profile?.displayName || t.user.username,
          successRate: t.successRate,
          totalTips: t.totalTips,
        })),
        recentUsers: recentUsers.map(({ password: _, ...u }) => u),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Utilisateurs ─────────────────────────────────────────────────────────────
async function getUsers(req, res, next) {
  try {
    const schema = z.object({
      page: z.string().default('1').transform(Number),
      limit: z.string().default('20').transform(Number),
      search: z.string().optional(),
      role: z.enum(['USER', 'ADMIN']).optional(),
      plan: z.string().optional(),
    });
    const { page, limit, search, role, plan } = schema.parse(req.query);

    const where = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (plan) where.subscription = { plan: { code: plan } };

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          subscription: { include: { plan: true } },
          tipsterStats: { select: { totalTips: true, successRate: true } },
          _count: { select: { tips: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      data: users.map(({ password: _, ...u }) => u),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function toggleUserStatus(req, res, next) {
  try {
    const { userId } = req.params;
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const user = await prisma.user.update({ where: { id: userId }, data: { isActive } });
    const { password: _, ...userSafe } = user;
    res.json({ success: true, message: `Compte ${isActive ? 'activé' : 'désactivé'}`, data: userSafe });
  } catch (err) {
    next(err);
  }
}

// ─── Signalements ─────────────────────────────────────────────────────────────
async function getReports(req, res, next) {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const where = status ? { status } : {};

    const [total, reports] = await prisma.$transaction([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        include: {
          reporter: { include: { profile: true } },
          tip: { include: { user: { include: { profile: true } }, match: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
    ]);

    res.json({ success: true, data: reports, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    next(err);
  }
}

async function resolveReport(req, res, next) {
  try {
    const { reportId } = req.params;
    const { status, adminNote, hideTip, suspendUser } = z.object({
      status: z.enum(['REVIEWED', 'DISMISSED', 'ACTIONED']),
      adminNote: z.string().max(500).optional(),
      hideTip: z.boolean().optional(),
      suspendUser: z.boolean().optional(),
    }).parse(req.body);

    const report = await prisma.report.findUnique({ where: { id: reportId }, include: { tip: true } });
    if (!report) throw new AppError('Signalement introuvable', 404, 'NOT_FOUND');

    const ops = [prisma.report.update({ where: { id: reportId }, data: { status, adminNote } })];
    if (hideTip) ops.push(prisma.tip.update({ where: { id: report.tipId }, data: { isVisible: false } }));
    if (suspendUser) ops.push(prisma.user.update({ where: { id: report.tip.userId }, data: { isActive: false } }));

    await prisma.$transaction(ops);
    res.json({ success: true, message: 'Signalement traité' });
  } catch (err) {
    next(err);
  }
}

// ─── Compétitions ─────────────────────────────────────────────────────────────
async function getAdminCompetitions(req, res, next) {
  try {
    const competitions = await prisma.competition.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { matches: true } },
      },
    });
    res.json({ success: true, data: competitions });
  } catch (err) {
    next(err);
  }
}

async function toggleCompetitionDisplay(req, res, next) {
  try {
    const { competitionId } = req.params;
    const { isDisplayed } = z.object({ isDisplayed: z.boolean() }).parse(req.body);
    const comp = await prisma.competition.update({ where: { id: competitionId }, data: { isDisplayed } });
    res.json({ success: true, data: comp });
  } catch (err) {
    next(err);
  }
}

// ─── Tipsters ─────────────────────────────────────────────────────────────────
async function getAdminTipsters(req, res, next) {
  try {
    const schema = z.object({
      page: z.string().default('1').transform(Number),
      limit: z.string().default('20').transform(Number),
      search: z.string().optional(),
    });
    const { page, limit, search } = schema.parse(req.query);

    const where = { tipsterStats: { isNot: null } };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, tipsters] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          tipsterStats: true,
          subscription: { include: { plan: true } },
          _count: { select: { tips: true } },
        },
        orderBy: { tipsterStats: { successRate: 'desc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      data: tipsters.map(({ password: _, ...u }) => u),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Paiements ────────────────────────────────────────────────────────────────
async function getAdminPayments(req, res, next) {
  try {
    const schema = z.object({
      page: z.string().default('1').transform(Number),
      limit: z.string().default('20').transform(Number),
      status: z.string().optional(),
    });
    const { page, limit, status } = schema.parse(req.query);

    const where = status ? { status } : {};

    const [total, payments] = await prisma.$transaction([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: { user: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Matchs ───────────────────────────────────────────────────────────────────
async function getAdminMatches(req, res, next) {
  try {
    const schema = z.object({
      page: z.string().default('1').transform(Number),
      limit: z.string().default('20').transform(Number),
      status: z.string().optional(),
      competitionId: z.string().optional(),
    });
    const { page, limit, status, competitionId } = schema.parse(req.query);

    const where = {};
    if (status) where.status = status;
    if (competitionId) where.competitionId = competitionId;

    const [total, matches] = await prisma.$transaction([
      prisma.match.count({ where }),
      prisma.match.findMany({
        where,
        include: { competition: true, _count: { select: { tips: true } } },
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      data: matches,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Sync & prédictions ───────────────────────────────────────────────────────
async function syncPredictions(req, res, next) {
  try {
    const schema = z.object({
      date:     z.string().optional(),
      forceAll: z.string().optional().transform((v) => v === 'true'),
    });
    const { date, forceAll } = schema.parse(req.query);

    const today    = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dates    = date ? [date] : [today, tomorrow];

    const results = [];
    for (const d of dates) {
      if (forceAll) {
        // Réinitialise les prédictions pour recalculer même les matchs déjà traités
        await prisma.match.updateMany({
          where: {
            scheduledAt: { gte: new Date(d), lt: new Date(new Date(d).setDate(new Date(d).getDate() + 1)) },
            status: 'SCHEDULED',
          },
          data: { predictions: null },
        });
      }
      const count = await calculatePredictionsForDate(d);
      results.push({ date: d, calculated: count });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

async function triggerSync(req, res, next) {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    await syncMatchesForDate(date);
    res.json({ success: true, message: `Sync déclenché pour ${date}` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  getUsers, toggleUserStatus,
  getReports, resolveReport,
  getAdminCompetitions, toggleCompetitionDisplay,
  getAdminTipsters,
  getAdminPayments,
  getAdminMatches,
  syncPredictions,
  triggerSync,
};
