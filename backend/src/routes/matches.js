const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { attachPlan } = require('../middleware/subscription');
const { getMatches, getMatchById, getMatchContext, getStandings, getCompetitions, getMatchStats, getLeagueStats, getMatchOdds, getMatchEvents } = require('../controllers/matchController');
const { askAboutMatch } = require('../services/chatService');
const { setReminder, deleteReminder } = require('../controllers/remindersController');
const { getLiveAnalysis } = require('../services/liveAnalysisService');

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

// Cotes bookmakers réelles (The Odds API, cache in-memory) — public
router.get('/:id/odds', getMatchOdds);

// Évènements live (buts, cartons, remplacements) — public
router.get('/:id/events', getMatchEvents);

// Chat IA — question sur un match (authentification requise, quota par plan)
router.post('/:id/chat', authenticate, attachPlan, async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Question trop courte.' });
  }
  if (question.length > 500) {
    return res.status(400).json({ success: false, message: 'Question trop longue (500 caractères max).' });
  }
  try {
    const result = await askAboutMatch(req.params.id, question.trim(), req.user);
    return res.json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
});

// Analyse IA live — public (cachée 5 min)
router.get('/:id/live-analysis', async (req, res, next) => {
  try {
    const analysis = await getLiveAnalysis(req.params.id);
    if (!analysis) return res.json({ success: true, data: null });
    res.json({ success: true, data: analysis });
  } catch (err) { next(err); }
});

// Rappels de match
router.post('/:id/reminder', authenticate, setReminder);
router.delete('/:id/reminder', authenticate, deleteReminder);

module.exports = router;
