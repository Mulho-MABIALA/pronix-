const prisma = require('../config/database');
const { generateMatchPrediction } = require('../services/claudeService');
const { AppError } = require('../middleware/errorHandler');

// Limite : max 5 générations IA par utilisateur par jour
const dailyLimitCache = new Map(); // userId → { date: 'YYYY-MM-DD', count: n }
const DAILY_LIMIT = 5;

function checkDailyLimit(userId) {
  const today = new Date().toISOString().split('T')[0];
  const entry = dailyLimitCache.get(userId);
  if (!entry || entry.date !== today) {
    dailyLimitCache.set(userId, { date: today, count: 0 });
    return 0;
  }
  return entry.count;
}

function incrementDailyLimit(userId) {
  const today = new Date().toISOString().split('T')[0];
  const entry = dailyLimitCache.get(userId) || { date: today, count: 0 };
  entry.count += 1;
  dailyLimitCache.set(userId, entry);
}

function getResult(m, teamName) {
  if (m.homeScore === null || m.awayScore === null) return null;
  const isHome = m.homeTeam === teamName;
  if (m.homeScore === m.awayScore) return 'D';
  const homeWon = m.homeScore > m.awayScore;
  return (isHome ? homeWon : !homeWon) ? 'W' : 'L';
}

async function generateAiTip(req, res, next) {
  try {
    const { matchId } = req.body;
    if (!matchId) throw new AppError('matchId requis', 400, 'VALIDATION_ERROR');

    // Vérif quota journalier
    const usedToday = checkDailyLimit(req.user.id);
    if (usedToday >= DAILY_LIMIT) {
      throw new AppError(
        `Limite atteinte : ${DAILY_LIMIT} analyses IA par jour maximum`,
        429,
        'DAILY_LIMIT_EXCEEDED'
      );
    }

    // Récupère le match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { competition: true },
    });
    if (!match) throw new AppError('Match introuvable', 404, 'NOT_FOUND');
    if (match.status !== 'SCHEDULED') {
      throw new AppError('Ce match a déjà commencé ou est terminé', 400, 'INVALID_MATCH_STATUS');
    }

    // Récupère forme + H2H depuis la DB
    const [homeMatches, awayMatches, h2hMatches] = await Promise.all([
      prisma.match.findMany({
        where: {
          status: 'FINISHED',
          OR: [{ homeTeam: match.homeTeam }, { awayTeam: match.homeTeam }],
          NOT: { id: match.id },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
      }),
      prisma.match.findMany({
        where: {
          status: 'FINISHED',
          OR: [{ homeTeam: match.awayTeam }, { awayTeam: match.awayTeam }],
          NOT: { id: match.id },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
      }),
      prisma.match.findMany({
        where: {
          status: 'FINISHED',
          OR: [
            { homeTeam: match.homeTeam, awayTeam: match.awayTeam },
            { homeTeam: match.awayTeam, awayTeam: match.homeTeam },
          ],
        },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
      }),
    ]);

    const homeForm = homeMatches.map((m) => ({ ...m, result: getResult(m, match.homeTeam) }));
    const awayForm = awayMatches.map((m) => ({ ...m, result: getResult(m, match.awayTeam) }));

    // Appel Claude
    const prediction = await generateMatchPrediction({
      match,
      homeForm,
      awayForm,
      h2h: h2hMatches,
    });

    incrementDailyLimit(req.user.id);

    res.json({
      success: true,
      data: prediction,
      meta: { usedToday: usedToday + 1, dailyLimit: DAILY_LIMIT },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { generateAiTip };
