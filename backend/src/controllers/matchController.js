const { z } = require('zod');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { syncMatchesForDate } = require('../cron/syncMatches');
const footballApi = require('../services/footballApi');

// ─── Liste des matchs ──────────────────────────────────────────────────────────
async function getMatches(req, res, next) {
  try {
    const schema = z.object({
      date: z.string().optional(),
      competitionId: z.string().optional(),
      status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED']).optional(),
      page: z.string().default('1').transform(Number),
      limit: z.string().default('20').transform(Number),
    });
    const { date, competitionId, status, page, limit } = schema.parse(req.query);

    const targetDate = date || new Date().toISOString().split('T')[0];
    const d = new Date(targetDate);
    const dNext = new Date(targetDate);
    dNext.setDate(dNext.getDate() + 1);

    const where = { scheduledAt: { gte: d, lt: dNext } };
    if (competitionId) where.competitionId = competitionId;
    if (status) where.status = status;

    const existingCount = await prisma.match.count({ where: { scheduledAt: { gte: d, lt: dNext } } });

    if (existingCount === 0) {
      const diffDays = Math.round((d - new Date()) / (1000 * 60 * 60 * 24));
      if (diffDays >= -1 && diffDays <= 7) {
        console.log(`[Matches] Sync à la volée pour ${targetDate}`);
        await syncMatchesForDate(targetDate).catch((e) =>
          console.error('[Matches] Sync à la volée échouée:', e.message)
        );
      }
    }

    const [total, matches] = await prisma.$transaction([
      prisma.match.count({ where }),
      prisma.match.findMany({
        where,
        include: { competition: true },
        orderBy: { scheduledAt: 'asc' },
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

// ─── Détail d'un match ─────────────────────────────────────────────────────────
async function getMatchById(req, res, next) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: {
        competition: true,
        tips: {
          where: { isVisible: true },
          include: {
            user: { include: { profile: true, tipsterStats: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!match) throw new AppError('Match introuvable', 404, 'NOT_FOUND');

    const userPlan = req.userPlan || 'FREE';
    const isPremium = ['PREMIUM', 'PRO'].includes(userPlan);

    const response = { ...match };
    if (!isPremium) {
      response.lineups = null;
      response.statistics = null;
      response.headToHead = null;
      response.injuries = null;
    }

    res.json({ success: true, data: response });
  } catch (err) {
    next(err);
  }
}

// ─── Contexte enrichi : forme + H2H depuis la base ────────────────────────────
async function getMatchContext(req, res, next) {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) throw new AppError('Match introuvable', 404, 'NOT_FOUND');

    const formFilter = (teamName) => ({
      OR: [{ homeTeam: teamName }, { awayTeam: teamName }],
      status: 'FINISHED',
      scheduledAt: { lt: match.scheduledAt },
    });

    const [homeForm, awayForm, h2h] = await Promise.all([
      prisma.match.findMany({
        where: formFilter(match.homeTeam),
        orderBy: { scheduledAt: 'desc' },
        take: 5,
        include: { competition: { select: { name: true } } },
      }),
      prisma.match.findMany({
        where: formFilter(match.awayTeam),
        orderBy: { scheduledAt: 'desc' },
        take: 5,
        include: { competition: { select: { name: true } } },
      }),
      prisma.match.findMany({
        where: {
          OR: [
            { homeTeam: match.homeTeam, awayTeam: match.awayTeam },
            { homeTeam: match.awayTeam, awayTeam: match.homeTeam },
          ],
          status: 'FINISHED',
          NOT: { id: match.id },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
        include: { competition: { select: { name: true } } },
      }),
    ]);

    const getResult = (m, teamName) => {
      if (m.homeScore === null || m.awayScore === null) return null;
      const scored = m.homeTeam === teamName ? m.homeScore : m.awayScore;
      const conceded = m.homeTeam === teamName ? m.awayScore : m.homeScore;
      if (scored > conceded) return 'W';
      if (scored < conceded) return 'L';
      return 'D';
    };

    res.json({
      success: true,
      data: {
        homeForm: homeForm.map(m => ({ ...m, result: getResult(m, match.homeTeam) })),
        awayForm: awayForm.map(m => ({ ...m, result: getResult(m, match.awayTeam) })),
        h2h,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Classement calculé depuis nos matchs en base ─────────────────────────────
async function getStandings(req, res, next) {
  try {
    const { competitionId, leagueId } = req.query;

    // Résoudre la compétition demandée
    let comp = null;
    if (competitionId) {
      comp = await prisma.competition.findUnique({ where: { id: competitionId } });
    } else if (leagueId) {
      comp = await prisma.competition.findUnique({ where: { externalId: leagueId } });
    }

    // Liste de toutes les compétitions pour le sélecteur
    const allComps = await prisma.competition.findMany({
      where: { isDisplayed: true },
      orderBy: { name: 'asc' },
    });

    if (!comp) {
      return res.json({ success: true, data: { standings: [], competition: null, competitions: allComps } });
    }

    const finishedMatches = await prisma.match.findMany({
      where: { competitionId: comp.id, status: 'FINISHED' },
    });

    const teams = {};

    for (const m of finishedMatches) {
      if (m.homeScore === null || m.awayScore === null) continue;

      for (const [name, logo] of [[m.homeTeam, m.homeTeamLogo], [m.awayTeam, m.awayTeamLogo]]) {
        if (!teams[name]) teams[name] = { name, logo, MP: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 };
      }

      const home = teams[m.homeTeam];
      const away = teams[m.awayTeam];
      home.MP++; away.MP++;
      home.GF += m.homeScore; home.GA += m.awayScore;
      away.GF += m.awayScore; away.GA += m.homeScore;

      if (m.homeScore > m.awayScore)       { home.W++; home.Pts += 3; away.L++; }
      else if (m.homeScore < m.awayScore)  { away.W++; away.Pts += 3; home.L++; }
      else                                  { home.D++; home.Pts++;   away.D++; away.Pts++; }
    }

    const standings = Object.values(teams)
      .map(t => ({ ...t, GD: t.GF - t.GA }))
      .sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF);

    res.json({ success: true, data: { standings, competition: comp, competitions: allComps } });
  } catch (err) {
    next(err);
  }
}

// ─── Liste des compétitions ────────────────────────────────────────────────────
async function getCompetitions(req, res, next) {
  try {
    const competitions = await prisma.competition.findMany({
      where: { isDisplayed: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: competitions });
  } catch (err) {
    next(err);
  }
}

// ─── Statistiques d'un match (avec cache en DB) ───────────────────────────────
async function getMatchStats(req, res, next) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: { id: true, externalId: true, status: true, homeScore: true, awayScore: true,
                homeTeam: true, awayTeam: true, statistics: true },
    });
    if (!match) throw new AppError('Match introuvable', 404, 'NOT_FOUND');

    // Stats déjà en cache → retourner directement
    if (match.statistics) {
      return res.json({ success: true, data: match.statistics, cached: true });
    }

    // Seulement pour les matchs terminés ou en direct
    if (!['FINISHED', 'LIVE'].includes(match.status)) {
      return res.json({ success: true, data: null });
    }

    // Appel API FotMob
    const stats = await footballApi.getFixtureStatistics(match.externalId);

    if (stats) {
      // Cache en DB pour ne pas rappeler l'API
      await prisma.match.update({
        where: { id: match.id },
        data: { statistics: stats },
      });
      return res.json({ success: true, data: stats, cached: false });
    }

    // Pas de données API → générer des stats simulées basées sur le score
    if (match.status === 'FINISHED' && match.homeScore !== null) {
      const mock = generateMockStats(match);
      return res.json({ success: true, data: mock, cached: false, mock: true });
    }

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// Génère des stats plausibles basées sur le score (fallback si API ne répond pas)
function generateMockStats(match) {
  const h = match.homeScore;
  const a = match.awayScore;
  const total = h + a;

  // Possession corrélée au score
  const homePoss = Math.min(70, Math.max(30, 50 + (h - a) * 5 + Math.round(Math.random() * 8 - 4)));
  const awayPoss = 100 - homePoss;

  // Tirs corrélés aux buts
  const homeTirs = h * 4 + Math.round(Math.random() * 6 + 2);
  const awayTirs = a * 4 + Math.round(Math.random() * 6 + 2);

  return [
    { key: 'possession',         label: 'Possession',             home: homePoss,               away: awayPoss,              isPct: true },
    { key: 'shots_total',        label: 'Total des tirs',         home: homeTirs,               away: awayTirs },
    { key: 'shots_on_target',    label: 'Tirs cadrés',            home: h + Math.round(Math.random() * 3), away: a + Math.round(Math.random() * 3) },
    { key: 'dangerous_attacks',  label: 'Attaques dangereuses',   home: homeTirs * 2,           away: awayTirs * 2 },
    { key: 'corners',            label: 'Corners',                home: Math.round(Math.random() * 6 + 2), away: Math.round(Math.random() * 6 + 2) },
    { key: 'fouls',              label: 'Fautes',                 home: Math.round(Math.random() * 8 + 6), away: Math.round(Math.random() * 8 + 6) },
    { key: 'yellow_cards',       label: 'Cartons jaunes',         home: Math.round(Math.random() * 3),     away: Math.round(Math.random() * 3) },
  ];
}

// ─── Stats par ligue ──────────────────────────────────────────────────────────
async function getLeagueStats(req, res, next) {
  try {
    const competitions = await prisma.competition.findMany({
      where: { isDisplayed: true },
      orderBy: { name: 'asc' },
    });

    const results = await Promise.all(
      competitions.map(async (comp) => {
        const matches = await prisma.match.findMany({
          where: { competitionId: comp.id, status: 'FINISHED', homeScore: { not: null } },
          select: { homeScore: true, awayScore: true },
        });

        if (matches.length === 0) return null;

        let totalGoals = 0, btts = 0, over25 = 0, over15 = 0;
        let homeWins = 0, draws = 0, awayWins = 0;

        for (const m of matches) {
          const total = m.homeScore + m.awayScore;
          totalGoals += total;
          if (total > 2.5) over25++;
          if (total > 1.5) over15++;
          if (m.homeScore > 0 && m.awayScore > 0) btts++;
          if (m.homeScore > m.awayScore) homeWins++;
          else if (m.homeScore < m.awayScore) awayWins++;
          else draws++;
        }

        const n = matches.length;
        return {
          competition:  { id: comp.id, name: comp.name, country: comp.country, logo: comp.logo },
          totalMatches: n,
          avgGoals:     Math.round((totalGoals / n) * 100) / 100,
          bttsRate:     Math.round((btts   / n) * 100),
          over25Rate:   Math.round((over25  / n) * 100),
          over15Rate:   Math.round((over15  / n) * 100),
          homeWinRate:  Math.round((homeWins / n) * 100),
          drawRate:     Math.round((draws    / n) * 100),
          awayWinRate:  Math.round((awayWins / n) * 100),
        };
      })
    );

    res.json({ success: true, data: results.filter(Boolean) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMatches, getMatchById, getMatchContext, getStandings, getCompetitions, getMatchStats, getLeagueStats };
