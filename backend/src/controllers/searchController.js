const prisma = require('../config/database');

// ─── Recherche globale ────────────────────────────────────────────────────────
// GET /api/search?q=...&type=matches|tipsters|competitions
async function globalSearch(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    const type = req.query.type || 'all'; // matches | tipsters | competitions | all

    if (!q || q.length < 2) {
      return res.json({ success: true, data: { matches: [], tipsters: [], competitions: [], teams: [] } });
    }

    const searchStr = q.toLowerCase();

    const [matches, tipsters, competitions, teamsRaw] = await Promise.all([
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

      // ── Équipes (dédupliquées depuis les matchs en base) ────────────────
      (type === 'all' || type === 'teams')
        ? prisma.match.findMany({
            where: {
              OR: [
                { homeTeam: { contains: searchStr, mode: 'insensitive' } },
                { awayTeam: { contains: searchStr, mode: 'insensitive' } },
              ],
            },
            orderBy: { scheduledAt: 'desc' },
            take: 50,
            select: {
              homeTeamId: true, homeTeam: true, homeTeamLogo: true,
              awayTeamId: true, awayTeam: true, awayTeamLogo: true,
            },
          })
        : [],
    ]);

    // Sanitiser les tipsters (pas de password)
    const tipstersSafe = tipsters.map(({ password, ...u }) => u);

    // Dédupliquer les équipes par teamId (une seule ligne par équipe trouvée)
    const teamsMap = new Map();
    for (const r of teamsRaw) {
      if (r.homeTeam?.toLowerCase().includes(searchStr) && !teamsMap.has(r.homeTeamId)) {
        teamsMap.set(r.homeTeamId, { id: r.homeTeamId, name: r.homeTeam, logo: r.homeTeamLogo });
      }
      if (r.awayTeam?.toLowerCase().includes(searchStr) && !teamsMap.has(r.awayTeamId)) {
        teamsMap.set(r.awayTeamId, { id: r.awayTeamId, name: r.awayTeam, logo: r.awayTeamLogo });
      }
    }
    const teams = [...teamsMap.values()].slice(0, 8);

    res.json({
      success: true,
      data: { matches, tipsters: tipstersSafe, competitions, teams },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { globalSearch };
