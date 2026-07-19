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
      page:         z.string().default('1').transform(Number),
      limit:        z.string().default('20').transform(Number),
      search:       z.string().optional(),
      role:         z.enum(['USER', 'ADMIN']).optional(),
      plan:         z.string().optional(),
      isActive:     z.string().optional(),
      createdAfter: z.string().optional(),
      orderBy:      z.string().default('createdAt'),
      order:        z.enum(['asc', 'desc']).default('desc'),
    });
    const { page, limit, search, role, plan, isActive, createdAfter, orderBy, order } = schema.parse(req.query);

    const where = {};
    if (search) {
      where.OR = [
        { email:    { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (plan) where.subscription = { plan: { code: plan } };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (createdAfter) where.createdAt = { gte: new Date(createdAfter) };

    const orderByClause = orderBy === 'tips'
      ? { tips: { _count: order } }
      : { [orderBy]: order };

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          subscription: { include: { plan: true } },
          tipsterStats: { select: { totalTips: true, successRate: true } },
          _count: { select: { tips: true, payments: true } },
        },
        orderBy: orderByClause,
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

async function getUserStats(req, res, next) {
  try {
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, newThisMonth, newThisWeek, suspended, activeSubscriptions] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: firstOfMonth } } }),
      prisma.user.count({ where: { createdAt: { gte: lastWeek } } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]);

    res.json({ success: true, data: { total, newThisMonth, newThisWeek, suspended, activeSubscriptions } });
  } catch (err) { next(err); }
}

async function sendEmailToUser(req, res, next) {
  try {
    const { userId } = req.params;
    const { subject, message } = z.object({
      subject: z.string().min(1).max(200),
      message: z.string().min(1).max(5000),
    }).parse(req.body);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, username: true } });

    const { sendEmail } = require('../services/emailService');
    await sendEmail({
      to: user.email,
      subject,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#6366f1">Message de l'équipe fpronix</h2>
        <p>Bonjour ${user.username},</p>
        <div style="white-space:pre-wrap">${message}</div>
        <hr style="margin:24px 0">
        <p style="color:#888;font-size:12px">fpronix.com — L'équipe support</p>
      </div>`,
    });

    res.json({ success: true, message: `Email envoyé à ${user.email}` });
  } catch (err) { next(err); }
}

async function updateUserRole(req, res, next) {
  try {
    const { userId } = req.params;
    const { role } = z.object({ role: z.enum(['USER', 'ADMIN']) }).parse(req.body);
    await prisma.user.update({ where: { id: userId }, data: { role } });
    res.json({ success: true, message: `Rôle mis à jour : ${role}` });
  } catch (err) { next(err); }
}

async function cancelUserSubscription(req, res, next) {
  try {
    const { userId } = req.params;
    await prisma.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED', endsAt: new Date() },
    });
    res.json({ success: true, message: 'Abonnement annulé' });
  } catch (err) { next(err); }
}

async function updateAdminNote(req, res, next) {
  try {
    const { userId } = req.params;
    const { note } = z.object({ note: z.string().max(2000) }).parse(req.body);
    await prisma.user.update({ where: { id: userId }, data: { adminNote: note || null } });
    res.json({ success: true, message: 'Note enregistrée' });
  } catch (err) { next(err); }
}

async function creditUserWallet(req, res, next) {
  try {
    const { userId } = req.params;
    const { amount, description } = z.object({
      amount:      z.number().min(1).max(10000),
      description: z.string().default('Crédit administrateur'),
    }).parse(req.body);

    const wallet = await prisma.virtualWallet.upsert({
      where: { userId },
      update: { balance: { increment: amount } },
      create: { userId, balance: amount },
    });

    res.json({ success: true, data: wallet, message: `+${amount} crédits ajoutés` });
  } catch (err) { next(err); }
}

async function getUserTips(req, res, next) {
  try {
    const { userId } = req.params;
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 10;

    const [total, tips] = await prisma.$transaction([
      prisma.tip.count({ where: { userId } }),
      prisma.tip.findMany({
        where: { userId },
        include: {
          match: { select: { homeTeam: true, awayTeam: true, matchDate: true, competition: { select: { name: true } } } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({ success: true, data: tips, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

async function getUserPayments(req, res, next) {
  try {
    const { userId } = req.params;
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 10;

    const [total, payments] = await prisma.$transaction([
      prisma.payment.count({ where: { userId } }),
      prisma.payment.findMany({
        where: { userId },
        include: { plan: { select: { name: true, code: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({ success: true, data: payments, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

async function getUserReferrals(req, res, next) {
  try {
    const { userId } = req.params;
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referee: {
          select: {
            id: true, username: true, createdAt: true,
            profile: { select: { displayName: true, avatar: true } },
            subscription: { include: { plan: { select: { code: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: referrals });
  } catch (err) { next(err); }
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

// ─── Finances (stats agrégées) ───────────────────────────────────────────────
async function getAdminFinances(req, res, next) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRevenue,
      monthRevenue,
      lastMonthRevenue,
      revenueByMethod,
      revenueByStatus,
      activeSubscriptions,
      recentPayments,
      subscriptionsByPlan,
    ] = await prisma.$transaction([
      // Revenu total (paiements COMPLETED)
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
      // Revenu ce mois
      prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      // Revenu mois dernier
      prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      // Répartition par méthode de paiement
      prisma.payment.groupBy({
        by: ['provider'],
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
      // Répartition par statut
      prisma.payment.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Abonnements actifs
      prisma.subscription.count({
        where: { status: 'ACTIVE', endDate: { gte: now } },
      }),
      // 20 dernières transactions
      prisma.payment.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { username: true, email: true } },
        },
      }),
      // Abonnements par plan
      prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: 'ACTIVE' },
        _count: true,
      }),
    ]);

    // Dépenses
    const [totalExpenses, monthExpenses, recentExpenses] = await Promise.all([
      prisma.expense.aggregate({ _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({
        where: { date: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.findMany({ orderBy: { date: 'desc' }, take: 50 }),
    ]);

    const totalRev = totalRevenue._sum.amount || 0;
    const totalExp = totalExpenses._sum.amount || 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: totalRev,
          totalPayments: totalRevenue._count,
          monthRevenue: monthRevenue._sum.amount || 0,
          monthPayments: monthRevenue._count,
          lastMonthRevenue: lastMonthRevenue._sum.amount || 0,
          activeSubscriptions,
          growth: lastMonthRevenue._sum.amount > 0
            ? Math.round(((monthRevenue._sum.amount - lastMonthRevenue._sum.amount) / lastMonthRevenue._sum.amount) * 100)
            : null,
          totalExpenses: totalExp,
          totalExpensesCount: totalExpenses._count,
          monthExpenses: monthExpenses._sum.amount || 0,
          monthExpensesCount: monthExpenses._count,
          netProfit: totalRev - totalExp,
        },
        byMethod: revenueByMethod,
        byStatus: revenueByStatus,
        byPlan: subscriptionsByPlan,
        recentPayments,
        expenses: recentExpenses,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Dépenses (Sorties) ───────────────────────────────────────────────────────
async function createExpense(req, res, next) {
  try {
    const schema = z.object({
      amount:      z.number().int().positive(),
      description: z.string().min(1).max(255),
      category:    z.enum(['hosting', 'domain', 'api', 'marketing', 'salary', 'other']).default('other'),
      date:        z.string().optional(),
    });
    const data = schema.parse(req.body);
    const expense = await prisma.expense.create({
      data: {
        amount:      data.amount,
        description: data.description,
        category:    data.category,
        date:        data.date ? new Date(data.date) : new Date(),
      },
    });
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.expense.delete({ where: { id } });
    res.json({ success: true });
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

// ─── Export CSV ───────────────────────────────────────────────────────────────
function toCsv(headers, rows) {
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(row.map(escape).join(','));
  return lines.join('\n');
}

async function exportUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, username: true, role: true,
        emailVerified: true, isActive: true, createdAt: true,
        referralCode: true,
        subscription: { select: { status: true, plan: { select: { code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const csv = toCsv(
      ['id', 'email', 'username', 'role', 'emailVerified', 'isActive', 'plan', 'subscription', 'referralCode', 'createdAt'],
      users.map((u) => [
        u.id, u.email, u.username, u.role,
        u.emailVerified, u.isActive,
        u.subscription?.plan?.code || 'FREE',
        u.subscription?.status || 'NONE',
        u.referralCode || '',
        u.createdAt.toISOString(),
      ])
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="fpronix_users_${new Date().toISOString().slice(0,10)}.csv"`);
    res.send('﻿' + csv); // BOM pour Excel UTF-8
  } catch (err) {
    next(err);
  }
}

async function exportPayments(req, res, next) {
  try {
    const payments = await prisma.payment.findMany({
      include: { user: { select: { email: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const csv = toCsv(
      ['id', 'email', 'username', 'amount_fcfa', 'currency', 'method', 'status', 'provider', 'providerRef', 'transactionId', 'createdAt'],
      payments.map((p) => [
        p.id, p.user?.email || '', p.user?.username || '',
        p.amount, p.currency, p.method, p.status,
        p.provider, p.providerRef || '', p.transactionId || '',
        p.createdAt.toISOString(),
      ])
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="fpronix_payments_${new Date().toISOString().slice(0,10)}.csv"`);
    res.send('﻿' + csv);
  } catch (err) {
    next(err);
  }
}

// ─── Pronostics (modération) ──────────────────────────────────────────────────
async function getAdminTips(req, res, next) {
  try {
    const schema = z.object({
      page:    z.string().default('1').transform(Number),
      limit:   z.string().default('30').transform(Number),
      search:  z.string().optional(),
      result:  z.enum(['WIN', 'LOSS', 'PUSH', 'PENDING']).optional(),
      date:    z.string().optional(),
    });
    const { page, limit, search, result, date } = schema.parse(req.query);

    const where = {};
    if (result) where.result = result === 'PENDING' ? null : result;
    if (date) {
      const d = new Date(date);
      where.createdAt = { gte: d, lt: new Date(d.getTime() + 86400000) };
    }
    if (search) {
      where.OR = [
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { match: { homeTeam: { contains: search, mode: 'insensitive' } } },
        { match: { awayTeam: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, tips] = await prisma.$transaction([
      prisma.tip.count({ where }),
      prisma.tip.findMany({
        where,
        include: {
          user: { include: { profile: true } },
          match: { include: { competition: true } },
          _count: { select: { comments: true, reports: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({ success: true, data: tips, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

async function deleteAdminTip(req, res, next) {
  try {
    const { tipId } = req.params;
    await prisma.tip.delete({ where: { id: tipId } });
    res.json({ success: true, message: 'Pronostic supprimé' });
  } catch (err) { next(err); }
}

async function toggleTipVisibility(req, res, next) {
  try {
    const { tipId } = req.params;
    const { isVisible } = z.object({ isVisible: z.boolean() }).parse(req.body);
    await prisma.tip.update({ where: { id: tipId }, data: { isVisible } });
    res.json({ success: true, message: isVisible ? 'Pronostic affiché' : 'Pronostic masqué' });
  } catch (err) { next(err); }
}

// ─── Commentaires (modération) ───────────────────────────────────────────────
async function getAdminComments(req, res, next) {
  try {
    const schema = z.object({
      page:   z.string().default('1').transform(Number),
      limit:  z.string().default('30').transform(Number),
      search: z.string().optional(),
    });
    const { page, limit, search } = schema.parse(req.query);

    const where = search
      ? { OR: [
          { content: { contains: search, mode: 'insensitive' } },
          { user: { username: { contains: search, mode: 'insensitive' } } },
        ]}
      : {};

    const [total, comments] = await prisma.$transaction([
      prisma.tipComment.count({ where }),
      prisma.tipComment.findMany({
        where,
        include: {
          user: { include: { profile: true } },
          tip:  { include: { match: true, user: { include: { profile: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({ success: true, data: comments, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

async function deleteAdminComment(req, res, next) {
  try {
    const { commentId } = req.params;
    await prisma.tipComment.delete({ where: { id: commentId } });
    res.json({ success: true, message: 'Commentaire supprimé' });
  } catch (err) { next(err); }
}

// ─── Abonnement manuel ────────────────────────────────────────────────────────
async function activateUserSubscription(req, res, next) {
  try {
    const { userId } = req.params;
    const schema = z.object({
      planCode: z.enum(['PREMIUM', 'LIFETIME']).default('PREMIUM'),
      months:   z.number().int().min(1).max(12).default(1),
    });
    const { planCode, months } = schema.parse(req.body);

    const plan = await prisma.plan.findFirst({ where: { code: planCode } });
    if (!plan) throw new AppError('Plan introuvable', 404, 'NOT_FOUND');

    const endsAt = planCode === 'LIFETIME'
      ? new Date('2099-12-31')
      : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);

    await prisma.subscription.upsert({
      where: { userId },
      update: { planId: plan.id, status: 'ACTIVE', endsAt },
      create: { userId, planId: plan.id, status: 'ACTIVE', endsAt },
    });

    res.json({ success: true, message: `Abonnement ${planCode} activé jusqu'au ${endsAt.toLocaleDateString('fr-FR')}` });
  } catch (err) { next(err); }
}

// ─── Support tickets ──────────────────────────────────────────────────────────
async function getAdminSupportTickets(req, res, next) {
  try {
    const schema = z.object({
      page:   z.string().default('1').transform(Number),
      limit:  z.string().default('20').transform(Number),
      status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
    });
    const { page, limit, status } = schema.parse(req.query);
    const where = status ? { status } : {};

    const [total, tickets] = await prisma.$transaction([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        include: {
          user:     { include: { profile: true } },
          messages: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({ success: true, data: tickets, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

async function replyToSupportTicket(req, res, next) {
  try {
    const { ticketId } = req.params;
    const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body);

    const [msg] = await prisma.$transaction([
      prisma.supportMessage.create({ data: { ticketId, isAdmin: true, content } }),
      prisma.supportTicket.update({ where: { id: ticketId }, data: { status: 'IN_PROGRESS', updatedAt: new Date() } }),
    ]);

    res.json({ success: true, data: msg });
  } catch (err) { next(err); }
}

async function updateTicketStatus(req, res, next) {
  try {
    const { ticketId } = req.params;
    const { status } = z.object({ status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']) }).parse(req.body);
    await prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
    res.json({ success: true, message: 'Statut mis à jour' });
  } catch (err) { next(err); }
}

module.exports = {
  getDashboard,
  getUsers, toggleUserStatus,
  getUserStats,
  sendEmailToUser,
  updateUserRole,
  cancelUserSubscription,
  updateAdminNote,
  creditUserWallet,
  getUserTips,
  getUserPayments,
  getUserReferrals,
  getReports, resolveReport,
  getAdminCompetitions, toggleCompetitionDisplay,
  getAdminTipsters,
  getAdminPayments,
  getAdminFinances,
  createExpense, deleteExpense,
  getAdminMatches,
  syncPredictions,
  triggerSync,
  exportUsers, exportPayments,
  getAdminTips, deleteAdminTip, toggleTipVisibility,
  getAdminComments, deleteAdminComment,
  activateUserSubscription,
  getAdminSupportTickets, replyToSupportTicket, updateTicketStatus,
};
