const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { attachPlan } = require('../middleware/subscription');
const { getMatches, getMatchById, getMatchContext, getStandings, getCompetitions, getMatchStats, getLeagueStats } = require('../controllers/matchController');

const router = Router();

router.get('/', getMatches);
router.get('/competitions', getCompetitions);
router.get('/standings', getStandings);
router.get('/league-stats', getLeagueStats);

// Détail avec plan optionnel
router.get('/:id', (req, res, next) => {
  if (req.headers.authorization) {
    return authenticate(req, res, () => attachPlan(req, res, () => getMatchById(req, res, next)));
  }
  attachPlan(req, res, () => getMatchById(req, res, next));
});

// Contexte enrichi (H2H + forme) — public
router.get('/:id/context', getMatchContext);

// Statistiques du match (possession, tirs, etc.) — public
router.get('/:id/stats', getMatchStats);

module.exports = router;
