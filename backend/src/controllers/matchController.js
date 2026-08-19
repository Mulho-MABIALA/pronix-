const { z } = require('zod');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { syncMatchesForDate } = require('../cron/syncMatches');
const footballApi = require('../services/footballApi');
const oddsService = require('../services/oddsService');
const { deriveLiveMarkets } = require('../services/predictionService');

// ─── Aperçu gratuit des pronostics (paywall serveur) ───────────────────────────
// AVANT : `predictions` (Json? sur Match) était renvoyé intégralement pour
// TOUS les matchs par getMatches, quel que soit le plan — le "flou" appliqué
// aux picks au-delà de 3/jour n'existait que côté CSS dans Pronostics.jsx.
// N'importe qui pouvait donc récupérer tous les pronostics premium via
// l'onglet réseau des devtools. Le masquage doit se faire ICI, côté serveur.
// FREE_PREVIEW_LIMIT est aligné avec FREE_DAILY_LIMIT de Pronostics.jsx.
const FREE_PREVIEW_LIMIT = 3;

// Masque récursivement les valeurs "feuilles" d'un objet de prédictions tout
// en préservant sa forme (mêmes clés, même longueur de tableaux) — le
// frontend continue d'accéder à pred.bestPick.type, pred.allPicks[], etc.
// sans planter, mais aucune vraie valeur (probabilité, pick, score) ne fuite.
// Reste robuste si de nouveaux champs sont ajoutés à predictions plus tard
// (marchés corners/MT/live) puisqu'elle ne dépend d'aucun nom de champ précis.
function maskPredictionValue(value) {
  if (Array.isArray(value)) return value.map(maskPredictionValue);
  if (value && typeof value === 'object') {
    const masked = {};
    for (const key of Object.keys(value)) masked[key] = maskPredictionValue(value[key]);
    return masked;
  }
  if (typeof value === 'number') return 0;
  if (typeof value === 'string') return '•••';
  return value; // booléens / null / undefined inchangés
}

// Applique le paywall serveur sur une page de résultats getMatches : les
// FREE_PREVIEW_LIMIT premiers matchs (dans l'ordre trié scheduledAt asc,
// position absolue = skip + index local) gardent leurs predictions ; les
// suivants sont masqués et marqués `locked: true` pour que le frontend sache
// avec certitude lesquels flouter (au lieu de recalculer son propre index
// côté client, qui pouvait diverger de l'ordre serveur).
function applyPredictionsPaywall(matches, { userPlan, skip }) {
  const isPremiumPlan = userPlan && userPlan !== 'FREE';
  return matches.map((match, i) => {
    const globalIndex = skip + i;
    const shouldLock = !isPremiumPlan && globalIndex >= FREE_PREVIEW_LIMIT && !!match.predictions;
    if (!shouldLock) return { ...match, locked: false };
    return { ...match, predictions: maskPredictionValue(match.predictions), locked: true };
  });
}

// ─── Liste des matchs ──────────────────────────────────────────────────────────
async function getMatches(req, res, next) {
  try {
    const schema = z.object({
      date:          z.string().optional(),
      dateFrom:      z.string().optional(),
      dateTo:        z.string().optional(),
      competitionId: z.string().optional(),
      status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED']).optional(),
      page:  z.string().default('1').transform(Number),
      limit: z.string().default('20').transform((v) => Math.min(Number(v), 500)),
    });
    const { date, dateFrom, dateTo, competitionId, status, page, limit } = schema.parse(req.query);

    let startDate, endDate;
    if (dateFrom) {
      // Requête sur une plage de dates (jusqu'à 1 mois)
      startDate = new Date(dateFrom);
      endDate   = dateTo ? new Date(dateTo) : new Date(dateFrom);
      endDate.setDate(endDate.getDate() + 1); // inclure le dernier jour complet
    } else {
      // Requête sur une seule journée (comportement historique)
      const targetDate = date || new Date().toISOString().split('T')[0];
      startDate = new Date(targetDate);
      endDate   = new Date(targetDate);
      endDate.setDate(endDate.getDate() + 1);

      // Sync à la volée uniquement pour les requêtes jour par jour
      const existingCount = await prisma.match.count({ where: { scheduledAt: { gte: startDate, lt: endDate } } });
      if (existingCount === 0) {
        const diffDays = Math.round((startDate - new Date()) / (1000 * 60 * 60 * 24));
        if (diffDays >= -1 && diffDays <= 7) {
          console.log(`[Matches] Sync à la volée pour ${targetDate}`);
          const syncPromise = syncMatchesForDate(targetDate).catch((e) =>
            console.error('[Matches] Sync à la volée échouée:', e.message)
          );
          // On attend au maximum 4s la sync (la plupart des jours ont peu de
          // matchs et elle termine largement dans ce délai → réponse complète
          // dès le premier chargement). Au-delà, on répond avec ce qu'on a
          // (potentiellement vide) plutôt que de faire attendre l'utilisateur
          // 10-20s+ — la sync continue en arrière-plan et la requête suivante
          // (très probable quelques secondes après, vu le pattern de
          // navigation) récupérera les données déjà synchronisées.
          await Promise.race([
            syncPromise,
            new Promise((resolve) => setTimeout(resolve, 4000)),
          ]);
        }
      }
    }

    const where = { scheduledAt: { gte: startDate, lt: endDate } };
    if (competitionId) where.competitionId = competitionId;
    if (status) where.status = status;

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

    const data = applyPredictionsPaywall(matches, { userPlan: req.userPlan, skip: (page - 1) * limit });

    res.json({
      success: true,
      data,
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
    const isPremium = ['PREMIUM', 'PRO', 'LIFETIME'].includes(userPlan);
    const hasExternalId = match.externalId && !String(match.externalId).startsWith('mock');

    // Enrichissement API-Football (fetch lazy + cache en DB) pour les premium
    if (isPremium && hasExternalId) {
      const fetches = [];

      // Compositions : seulement si match en direct ou terminé
      if (!match.lineups && ['LIVE', 'FINISHED'].includes(match.status)) {
        fetches.push(
          footballApi.getFixtureLineups(match.externalId)
            .then((lineups) => {
              if (lineups) {
                match.lineups = lineups;
                return prisma.match.update({ where: { id: match.id }, data: { lineups } });
              }
            })
            .catch(() => {})
        );
      }

      // H2H : toujours utile (pré-match, live, terminé)
      if (!match.headToHead && match.homeTeamId && match.awayTeamId) {
        fetches.push(
          footballApi.getHeadToHead(match.homeTeamId, match.awayTeamId, 10)
            .then((h2h) => {
              if (h2h?.length) {
                match.headToHead = h2h;
                return prisma.match.update({ where: { id: match.id }, data: { headToHead: h2h } });
              }
            })
            .catch(() => {})
        );
      }

      // Blessures : utile avant et pendant le match
      if (!match.injuries && ['SCHEDULED', 'LIVE'].includes(match.status)) {
        fetches.push(
          footballApi.getInjuries(match.externalId)
            .then((injuries) => {
              if (injuries?.length) {
                match.injuries = injuries;
                return prisma.match.update({ where: { id: match.id }, data: { injuries } });
              }
            })
            .catch(() => {})
        );
      }

      if (fetches.length > 0) await Promise.allSettled(fetches);
    }

    const response = { ...match };
    if (!isPremium) {
      response.lineups    = null;
      response.statistics = null;
      response.headToHead = null;
      response.injuries   = null;
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

    // Forme récente + confrontations directes = contenu Premium. Les non-abonnés
    // reçoivent quand même un teaser agrégé (V/N/D, pas le détail des matchs) —
    // un vrai aperçu convertit mieux qu'une boîte verrouillée vide, et le coût
    // de ces requêtes (take: 5, filtre simple) reste négligeable.
    const isPremium = ['PREMIUM', 'PRO', 'LIFETIME'].includes(req.userPlan || 'FREE');

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

    const homeResults = homeForm.map(m => getResult(m, match.homeTeam));
    const awayResults = awayForm.map(m => getResult(m, match.awayTeam));
    const summarize = (results) => ({
      wins:   results.filter(r => r === 'W').length,
      draws:  results.filter(r => r === 'D').length,
      losses: results.filter(r => r === 'L').length,
    });
    const h2hSummary = {
      homeWins: h2h.filter(m => getResult(m, match.homeTeam) === 'W').length,
      draws:    h2h.filter(m => getResult(m, match.homeTeam) === 'D').length,
      awayWins: h2h.filter(m => getResult(m, match.homeTeam) === 'L').length,
    };

    if (!isPremium) {
      // Teaser : le compte V/N/D est un vrai aperçu (calculé sur les vraies
      // données), mais le détail des matchs (dates, scores, adversaires)
      // reste verrouillé — c'est ça qui donne envie de débloquer, plutôt
      // qu'une boîte cadenassée vide.
      return res.json({
        success: true,
        data: {
          locked: true,
          homeFormSummary: summarize(homeResults),
          awayFormSummary: summarize(awayResults),
          h2hSummary,
          h2hCount: h2h.length,
        },
      });
    }

    res.json({
      success: true,
      data: {
        homeForm: homeForm.map((m, i) => ({ ...m, result: homeResults[i] })),
        awayForm: awayForm.map((m, i) => ({ ...m, result: awayResults[i] })),
        h2h,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Prochain adversaire d'une équipe (pour suggestion auto dans le comparateur) ─
async function getNextOpponent(req, res, next) {
  try {
    const schema = z.object({ teamName: z.string() });
    const { teamName } = schema.parse(req.query);

    const match = await prisma.match.findFirst({
      where: {
        OR: [{ homeTeam: teamName }, { awayTeam: teamName }],
        status: 'SCHEDULED',
        scheduledAt: { gte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    if (!match) return res.json({ success: true, data: null });

    const isHome = match.homeTeam === teamName;
    const opponent = {
      id:   isHome ? match.awayTeamId    : match.homeTeamId,
      name: isHome ? match.awayTeam      : match.homeTeam,
      logo: isHome ? match.awayTeamLogo  : match.homeTeamLogo,
    };

    res.json({ success: true, data: { opponent, matchId: match.id, scheduledAt: match.scheduledAt } });
  } catch (err) { next(err); }
}

// ─── Comparateur de deux équipes (forme + H2H, depuis nos matchs en base) ─────
async function getTeamCompare(req, res, next) {
  try {
    const schema = z.object({
      team1Id:   z.string(),
      team1Name: z.string(),
      team2Id:   z.string(),
      team2Name: z.string(),
    });
    const { team1Id, team1Name, team2Id, team2Name } = schema.parse(req.query);

    const formFilter = (teamName) => ({
      OR: [{ homeTeam: teamName }, { awayTeam: teamName }],
      status: 'FINISHED',
    });

    const getResult = (m, teamName) => {
      if (m.homeScore === null || m.awayScore === null) return null;
      const scored   = m.homeTeam === teamName ? m.homeScore : m.awayScore;
      const conceded = m.homeTeam === teamName ? m.awayScore : m.homeScore;
      if (scored > conceded) return 'W';
      if (scored < conceded) return 'L';
      return 'D';
    };

    const [form1, form2, h2h] = await Promise.all([
      prisma.match.findMany({
        where: formFilter(team1Name),
        orderBy: { scheduledAt: 'desc' },
        take: 10,
      }),
      prisma.match.findMany({
        where: formFilter(team2Name),
        orderBy: { scheduledAt: 'desc' },
        take: 10,
      }),
      prisma.match.findMany({
        where: {
          OR: [
            { homeTeam: team1Name, awayTeam: team2Name },
            { homeTeam: team2Name, awayTeam: team1Name },
          ],
          status: 'FINISHED',
        },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
        include: { competition: { select: { name: true } } },
      }),
    ]);

    const summarize = (matches, teamName) => {
      let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
      const form = [];
      for (const m of matches) {
        const r = getResult(m, teamName);
        if (!r) continue;
        if (r === 'W') wins++; else if (r === 'D') draws++; else losses++;
        goalsFor     += m.homeTeam === teamName ? m.homeScore : m.awayScore;
        goalsAgainst += m.homeTeam === teamName ? m.awayScore : m.homeScore;
        if (form.length < 5) form.push(r);
      }
      const played = wins + draws + losses;
      return {
        played, wins, draws, losses,
        goalsFor, goalsAgainst,
        avgGoalsFor:     played ? +(goalsFor / played).toFixed(2)     : 0,
        avgGoalsAgainst: played ? +(goalsAgainst / played).toFixed(2) : 0,
        form,
      };
    };

    let team1Wins = 0, h2hDraws = 0, team2Wins = 0;
    const h2hMatches = h2h.map((m) => {
      const isTeam1Home = m.homeTeam === team1Name;
      const t1Goals = isTeam1Home ? m.homeScore : m.awayScore;
      const t2Goals = isTeam1Home ? m.awayScore : m.homeScore;
      if (t1Goals != null && t2Goals != null) {
        if (t1Goals > t2Goals) team1Wins++;
        else if (t1Goals === t2Goals) h2hDraws++;
        else team2Wins++;
      }
      return {
        id: m.id,
        scheduledAt: m.scheduledAt,
        homeTeam: m.homeTeam, awayTeam: m.awayTeam,
        homeScore: m.homeScore, awayScore: m.awayScore,
        competition: m.competition?.name,
      };
    });

    res.json({
      success: true,
      data: {
        team1: { id: team1Id, name: team1Name, stats: summarize(form1, team1Name) },
        team2: { id: team2Id, name: team2Name, stats: summarize(form2, team2Name) },
        h2h: { matches: h2hMatches, team1Wins, draws: h2hDraws, team2Wins },
      },
    });
  } catch (err) { next(err); }
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

// Marchés live (1X2/over-under/score exact/corners recalculés minute par
// minute) — rien n'est stocké, on recalcule à chaque requête depuis les
// prédictions pré-match déjà en base + l'état courant du match (score/minute/
// corners, tenus à jour par cron/syncMatches.js). Le front poll cet endpoint
// toutes les ~20-30s pendant qu'un match est LIVE (voir LiveMarkets.jsx).
async function getLiveMarkets(req, res, next) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, status: true, homeScore: true, awayScore: true, minute: true,
        homeCorners: true, awayCorners: true, predictions: true,
      },
    });
    if (!match) throw new AppError('Match introuvable', 404, 'NOT_FOUND');

    if (match.status !== 'LIVE') {
      return res.json({ success: true, data: null });
    }

    const live = deriveLiveMarkets(match.predictions, {
      homeScore:   match.homeScore,
      awayScore:   match.awayScore,
      minute:      match.minute,
      homeCorners: match.homeCorners,
      awayCorners: match.awayCorners,
    });

    res.json({ success: true, data: live });
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
const LEAGUE_STATS_MIN_SAMPLE = 10; // en dessous, l'échantillon est trop faible pour être fiable

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
          lowSample:    n < LEAGUE_STATS_MIN_SAMPLE,
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

// ─── Filtre statistique avancé (façon BetMines — 100% calculé sur nos données locales) ──
// Aucun appel API externe ici : tout est dérivé des matchs FINISHED déjà en base,
// pour éviter de consommer le quota API-Football (100 req/jour en plan gratuit).

const ADVANCED_EVENTS = {
  over15:   (h, a) => (h + a) > 1.5,
  over25:   (h, a) => (h + a) > 2.5,
  over35:   (h, a) => (h + a) > 3.5,
  under15:  (h, a) => (h + a) < 1.5,
  under25:  (h, a) => (h + a) < 2.5,
  under35:  (h, a) => (h + a) < 3.5,
  btts_yes: (h, a) => h > 0 && a > 0,
  btts_no:  (h, a) => !(h > 0 && a > 0),
};

function advEventHit(event, m) {
  if (m.homeScore == null || m.awayScore == null) return null;
  const fn = ADVANCED_EVENTS[event];
  return fn ? fn(m.homeScore, m.awayScore) : null;
}

function advPct(matches, event) {
  const results = matches.map((m) => advEventHit(event, m)).filter((v) => v !== null);
  if (!results.length) return { pct: null, n: 0 };
  const hits = results.filter(Boolean).length;
  return { pct: Math.round((hits / results.length) * 100), n: results.length };
}

function advGoalsFor(m, teamName) {
  const isHome = m.homeTeam === teamName;
  return {
    scored:   isHome ? m.homeScore : m.awayScore,
    conceded: isHome ? m.awayScore : m.homeScore,
  };
}

function advAvgGoals(matches, teamName) {
  const rows = matches.map((m) => advGoalsFor(m, teamName)).filter((r) => r.scored != null && r.conceded != null);
  if (!rows.length) return { avgScored: null, avgConceded: null, n: 0 };
  const scored   = rows.reduce((s, r) => s + r.scored, 0)   / rows.length;
  const conceded = rows.reduce((s, r) => s + r.conceded, 0) / rows.length;
  return { avgScored: Math.round(scored * 100) / 100, avgConceded: Math.round(conceded * 100) / 100, n: rows.length };
}

async function getAdvancedFilterMatches(req, res, next) {
  try {
    const schema = z.object({
      dateFrom:       z.string().optional(),
      dateTo:         z.string().optional(),
      competitionIds: z.string().optional(), // liste séparée par des virgules
      event:          z.enum(Object.keys(ADVANCED_EVENTS)).default('over25'),
      homeLast10Min:  z.string().optional().transform((v) => (v ? Number(v) : 0)),
      awayLast10Min:  z.string().optional().transform((v) => (v ? Number(v) : 0)),
      homeLeagueMin:  z.string().optional().transform((v) => (v ? Number(v) : 0)),
      awayLeagueMin:  z.string().optional().transform((v) => (v ? Number(v) : 0)),
      h2hMin:         z.string().optional().transform((v) => (v ? Number(v) : 0)),
      avgScoredMin:   z.string().optional().transform((v) => (v ? Number(v) : 0)),
      avgConcededMax: z.string().optional().transform((v) => (v !== undefined && v !== '' ? Number(v) : null)),
      limit:          z.string().default('80').transform((v) => Math.min(Number(v), 200)),
    });

    const {
      dateFrom, dateTo, competitionIds, event,
      homeLast10Min, awayLast10Min, homeLeagueMin, awayLeagueMin,
      h2hMin, avgScoredMin, avgConcededMax, limit,
    } = schema.parse(req.query);

    const today     = new Date().toISOString().split('T')[0];
    const startDate = new Date(dateFrom || today);
    const endDate   = new Date(dateTo || dateFrom || today);
    endDate.setDate(endDate.getDate() + 1);

    const where = {
      scheduledAt: { gte: startDate, lt: endDate },
      status: { in: ['SCHEDULED', 'LIVE'] },
    };
    if (competitionIds) {
      const ids = competitionIds.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length) where.competitionId = { in: ids };
    }

    const candidates = await prisma.match.findMany({
      where,
      include: { competition: true },
      orderBy: { scheduledAt: 'asc' },
      take: 300, // pool de matchs candidats avant filtrage statistique
    });

    if (candidates.length === 0) {
      return res.json({ success: true, data: [], meta: { event, total: 0, candidatesScanned: 0 } });
    }

    // ── Récupération en masse (1-2 requêtes) des matchs terminés impliqués ────
    const teamNames = [...new Set(candidates.flatMap((m) => [m.homeTeam, m.awayTeam]))];
    const compIdsInvolved = [...new Set(candidates.map((m) => m.competitionId))];

    const [formPool, leaguePool] = await Promise.all([
      prisma.match.findMany({
        where: {
          status: 'FINISHED',
          homeScore: { not: null },
          OR: [{ homeTeam: { in: teamNames } }, { awayTeam: { in: teamNames } }],
        },
        orderBy: { scheduledAt: 'desc' },
        take: Math.min(6000, teamNames.length * 25),
        select: { homeTeam: true, awayTeam: true, homeScore: true, awayScore: true, competitionId: true },
      }),
      prisma.match.findMany({
        where: {
          status: 'FINISHED',
          homeScore: { not: null },
          competitionId: { in: compIdsInvolved },
        },
        select: { homeTeam: true, awayTeam: true, homeScore: true, awayScore: true, competitionId: true },
      }),
    ]);

    // Regroupement par équipe (formPool est déjà trié desc → l'ordre est préservé)
    const byTeam = new Map(teamNames.map((n) => [n, []]));
    for (const m of formPool) {
      if (byTeam.has(m.homeTeam)) byTeam.get(m.homeTeam).push(m);
      if (byTeam.has(m.awayTeam)) byTeam.get(m.awayTeam).push(m);
    }

    const results = [];

    for (const match of candidates) {
      const homeAll = byTeam.get(match.homeTeam) || [];
      const awayAll = byTeam.get(match.awayTeam) || [];

      const homeLast10 = homeAll.slice(0, 10);
      const awayLast10 = awayAll.slice(0, 10);
      const homeLast5  = homeAll.slice(0, 5);
      const awayLast5  = awayAll.slice(0, 5);

      const homeLeague = leaguePool.filter((m) => m.competitionId === match.competitionId && m.homeTeam === match.homeTeam);
      const awayLeague = leaguePool.filter((m) => m.competitionId === match.competitionId && m.awayTeam === match.awayTeam);

      const h2h = homeAll.filter((m) =>
        (m.homeTeam === match.homeTeam && m.awayTeam === match.awayTeam) ||
        (m.homeTeam === match.awayTeam && m.awayTeam === match.homeTeam)
      ).slice(0, 5);

      const homeLast10Stat = advPct(homeLast10, event);
      const awayLast10Stat = advPct(awayLast10, event);
      const homeLeagueStat = advPct(homeLeague, event);
      const awayLeagueStat = advPct(awayLeague, event);
      const h2hStat         = advPct(h2h, event);
      const homeGoals       = advAvgGoals(homeLast5, match.homeTeam);
      const awayGoals       = advAvgGoals(awayLast5, match.awayTeam);

      // ── Application des seuils demandés ─────────────────────────────────────
      if (homeLast10Min && (homeLast10Stat.pct ?? -1) < homeLast10Min) continue;
      if (awayLast10Min && (awayLast10Stat.pct ?? -1) < awayLast10Min) continue;
      if (homeLeagueMin && (homeLeagueStat.pct ?? -1) < homeLeagueMin) continue;
      if (awayLeagueMin && (awayLeagueStat.pct ?? -1) < awayLeagueMin) continue;
      if (h2hMin && (h2hStat.pct ?? -1) < h2hMin) continue;
      if (avgScoredMin) {
        const best = Math.max(homeGoals.avgScored ?? -1, awayGoals.avgScored ?? -1);
        if (best < avgScoredMin) continue;
      }
      if (avgConcededMax != null) {
        const worst = Math.min(homeGoals.avgConceded ?? Infinity, awayGoals.avgConceded ?? Infinity);
        if (worst > avgConcededMax) continue;
      }

      results.push({
        ...match,
        teamStats: {
          home: { last10: homeLast10Stat, league: homeLeagueStat, avgScored: homeGoals.avgScored, avgConceded: homeGoals.avgConceded, formN: homeGoals.n },
          away: { last10: awayLast10Stat, league: awayLeagueStat, avgScored: awayGoals.avgScored, avgConceded: awayGoals.avgConceded, formN: awayGoals.n },
          h2h: h2hStat,
        },
      });

      if (results.length >= limit) break;
    }

    res.json({ success: true, data: results, meta: { event, total: results.length, candidatesScanned: candidates.length } });
  } catch (err) {
    next(err);
  }
}

// ─── Cotes réelles (The Odds API) ────────────────────────────────────────────
async function getMatchOdds(req, res, next) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: { id: true, homeTeam: true, awayTeam: true, scheduledAt: true, status: true },
    });

    if (!match) throw new AppError('Match introuvable', 404, 'NOT_FOUND');

    // Cotes uniquement pour les matchs à venir ou en direct
    if (!['SCHEDULED', 'LIVE'].includes(match.status)) {
      return res.json({ success: true, data: null, reason: 'match_ended' });
    }

    const odds = oddsService.getOddsForMatch(match.homeTeam, match.awayTeam, match.scheduledAt);

    res.json({
      success: true,
      data: odds,
      status: oddsService.getStatus(),
    });
  } catch (err) {
    next(err);
  }
}

// ─── Évènements live (buts, cartons, remplacements) ──────────────────────────
async function getMatchEvents(req, res, next) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      select: { externalId: true, status: true, homeTeam: true, awayTeam: true },
    });
    if (!match) throw new AppError('Match introuvable', 404, 'NOT_FOUND');

    // Appel API-Football pour les évènements
    const raw = await footballApi.getFixtureEvents(match.externalId);

    const events = (raw || []).map((e) => ({
      time:    e.time?.elapsed,
      extra:   e.time?.extra,
      team:    e.team?.name,
      player:  e.player?.name,
      assist:  e.assist?.name,
      type:    e.type,   // 'Goal' | 'Card' | 'subst' | 'Var'
      detail:  e.detail, // 'Normal Goal' | 'Yellow Card' | 'Substitution 1'...
      comments: e.comments,
    }));

    res.setHeader('Cache-Control', match.status === 'LIVE' ? 'no-cache' : 'public, max-age=60');
    res.json({ success: true, data: events, matchStatus: match.status });
  } catch (err) { next(err); }
}

module.exports = { getMatches, getMatchById, getMatchContext, getStandings, getCompetitions, getMatchStats, getLeagueStats, getMatchOdds, getMatchEvents, getAdvancedFilterMatches, getTeamCompare, getNextOpponent, getLiveMarkets };
