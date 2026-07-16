const prisma = require('../config/database');

// ─── Recherche globale ────────────────────────────────────────────────────────
// GET /api/search?q=...&type=matches|tipsters|competitions
async function globalSearch(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    const type = req.query.type || 'all'; // matches | tipsters | competitions | all

    if (!q || q.length < 2) {
      return res.json({ success: true, data: { matches: [], tipsters: [], competitions: [] } });
    }

    const searchStr = q.toLowerCase();

    const [matches, tipsters, competitions] = await Promise.all([
      // ── Matchs ──────────────────────────────────────────────────────
      (type === 'all' || type === 'matches')
        ? prisma.match.findMany({
            where: {
              OR: [
                { homeTeam: { contains: searchStr, mode: 'insensitive' } },
                { awayTeam: { contains: searchStr, mode: 'insensitive' } },
                { competition: { name: { contains: searchStr, mode: 'insensitive' } } },
              ],
            },
            include: { competition: true },
            orderBy: { scheduledAt: 'desc' },
            take: 8,
          })
        : [],

      // ── Tipsters ─────────────────────────────────────────────────────
      (type === 'all' || type === 'tipsters')
        ? prisma.user.findMany({
            where: {
              OR: [
                { username: { contains: searchStr, mode: 'insensitive' } },
                { profile: { displayName: { contains: searchStr, mode: 'insensitive' } } },
              ],
              tipsterStats: { isNot: null },
            },
            include: {
              profile: true,
              tipsterStats: true,
            },
            take: 6,
          })
        : [],

      // ── Compétitions ─────────────────────────────────────────────────
      (type === 'all' || type === 'competitions')
        ? prisma.competition.findMany({
            where: {
              OR: [
                { name: { contains: searchStr, mode: 'insensitive' } },
                { country: { contains: searchStr, mode: 'insensitive' } },
              ],
              isDisplayed: true,
            },
            take: 6,
          })
        : [],
    ]);

    // Sanitiser les tipsters (pas de password)
    const tipstersSafe = tipsters.map(({ password, ...u }) => u);

    res.json({
      success: true,
      data: { matches, tipsters: tipstersSafe, competitions },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { globalSearch };
