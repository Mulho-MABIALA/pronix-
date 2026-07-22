// Analytics internes — suivi des événements sans Google Analytics
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const ALLOWED_EVENTS = [
  'tipster_view', 'tip_view', 'match_view',
  'conversion_attempt', 'search', 'blog_view', 'team_view',
];

// POST /api/analytics/log — enregistrer un événement (appel client)
async function logEvent(req, res, next) {
  try {
    const { event, entityId, metadata } = req.body;

    if (!ALLOWED_EVENTS.includes(event)) {
      return res.json({ success: true }); // Ignore silencieusement les events inconnus
    }

    // Fire-and-forget — ne pas bloquer la réponse
    prisma.eventLog.create({
      data: {
        userId: req.user?.id || null,
        event,
        entityId: entityId || null,
        metadata: metadata || null,
      },
    }).catch(() => {}); // Ignorer les erreurs d'analytics

    res.json({ success: true });
  } catch (err) { next(err); }
}

// GET /api/analytics/stats — dashboard admin
async function getStats(req, res, next) {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const [
      totalEvents,
      eventsByType,
      dailyActivity,
      topTipsters,
      topMatches,
      conversionAttempts,
    ] = await Promise.all([
      // Total events
      prisma.eventLog.count({ where: { createdAt: { gte: since } } }),

      // Events par type
      prisma.eventLog.groupBy({
        by: ['event'],
        where: { createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { event: 'desc' } },
      }),

      // Activité journalière (7 derniers jours)
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM event_logs
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,

      // Top tipsters les plus vus
      prisma.eventLog.groupBy({
        by: ['entityId'],
        where: { event: 'tipster_view', createdAt: { gte: since }, entityId: { not: null } },
        _count: true,
        orderBy: { _count: { entityId: 'desc' } },
        take: 5,
      }),

      // Top matchs les plus vus
      prisma.eventLog.groupBy({
        by: ['entityId'],
        where: { event: 'match_view', createdAt: { gte: since }, entityId: { not: null } },
        _count: true,
        orderBy: { _count: { entityId: 'desc' } },
        take: 5,
      }),

      // Tentatives de conversion Premium
      prisma.eventLog.count({
        where: { event: 'conversion_attempt', createdAt: { gte: since } },
      }),
    ]);

    // Utilisateurs uniques
    const uniqueUsers = await prisma.eventLog.findMany({
      where: { createdAt: { gte: since }, userId: { not: null } },
      select: { userId: true },
      distinct: ['userId'],
    });

    res.json({
      success: true,
      data: {
        period: `${days} jours`,
        totalEvents,
        uniqueUsers: uniqueUsers.length,
        conversionAttempts,
        eventsByType: eventsByType.map((e) => ({ event: e.event, count: e._count })),
        dailyActivity,
        topTipsterIds: topTipsters.map((t) => ({ id: t.entityId, views: t._count })),
        topMatchIds: topMatches.map((m) => ({ id: m.entityId, views: m._count })),
      },
    });
  } catch (err) { next(err); }
}

// GET /api/analytics/tipster/:id — stats d'un tipster spécifique
async function getTipsterAnalytics(req, res, next) {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const views = await prisma.eventLog.count({
      where: { event: 'tipster_view', entityId: id, createdAt: { gte: since } },
    });

    const tipViews = await prisma.eventLog.count({
      where: { event: 'tip_view', createdAt: { gte: since },
        metadata: { path: ['tipsterId'], equals: id } },
    });

    res.json({ success: true, data: { profileViews: views, tipViews, period: `${days}j` } });
  } catch (err) { next(err); }
}

module.exports = { logEvent, getStats, getTipsterAnalytics };
