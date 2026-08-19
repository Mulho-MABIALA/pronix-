const { Router } = require('express');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { attachPlan } = require('../middleware/subscription');
const { getMatches, getMatchById, getMatchContext, getStandings, getCompetitions, getMatchStats, getLeagueStats, getMatchOdds, getMatchEvents, getAdvancedFilterMatches, getTeamCompare, getNextOpponent, getLiveMarkets } = require('../controllers/matchController');
const { askAboutMatch } = require('../services/chatService');
const { setReminder, deleteReminder } = require('../controllers/remindersController');
const { requirePlan } = require('../middleware/subscription');
const { getLiveAnalysis } = require('../services/liveAnalysisService');
const { explainValueBet } = require('../services/valueBetAiService');

const router = Router();

// Liste des matchs — plan optionnel (attaché via cookie httpOnly OU header),
// nécessaire pour masquer côté serveur les pronostics au-delà de l'aperçu
// gratuit (voir FREE_PREVIEW_LIMIT dans matchController.js).
router.get('/', optionalAuthenticate, attachPlan, getMatches);
router.get('/competitions', getCompetitions);
router.get('/standings', getStandings);
router.get('/league-stats', getLeagueStats);
router.get('/advanced-filter', getAdvancedFilterMatches);
router.get('/compare-teams', getTeamCompare);
router.get('/next-opponent', getNextOpponent);

// Détail avec plan optionnel (cookie httpOnly OU header Authorization —
// optionalAuthenticate gère les deux, contrairement à l'ancien check manuel
// sur req.headers.authorization qui ignorait le cookie).
router.get('/:id', optionalAuthenticate, attachPlan, getMatchById);

// Contexte enrichi (H2H + forme) — Premium (dégradé gracieusement pour FREE, cf. controller)
router.get('/:id/context', optionalAuthenticate, attachPlan, getMatchContext);

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

// Marchés live (1X2/over-under/score exact/corners recalculés minute par
// minute) — Premium, aucun coût IA mais calcul + polling front à limiter
// aux abonnés (même logique de gating que live-analysis ci-dessous).
router.get('/:id/live-markets', authenticate, requirePlan('PREMIUM'), getLiveMarkets);

// Analyse IA live — Premium (coût IA, cachée 5 min)
router.get('/:id/live-analysis', authenticate, requirePlan('PREMIUM'), async (req, res, next) => {
  try {
    const analysis = await getLiveAnalysis(req.params.id);
    if (!analysis) return res.json({ success: true, data: null });
    res.json({ success: true, data: analysis });
  } catch (err) { next(err); }
});

// Explication IA value bet — Premium (coût IA, cachée 30 min)
router.post('/:id/value-bet-explain', authenticate, requirePlan('PREMIUM'), async (req, res, next) => {
  try {
    const { market, bookOdds, trueProb } = req.body;
    if (!market || !bookOdds || !trueProb) {
      return res.status(400).json({ success: false, message: 'market, bookOdds et trueProb sont requis' });
    }
    const data = await explainValueBet(req.params.id, {
      market,
      bookOdds: parseFloat(bookOdds),
      trueProb: parseFloat(trueProb),
    });
    if (!data) return res.json({ success: true, data: null });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Rappels de match
router.post('/:id/reminder', authenticate, setReminder);
router.delete('/:id/reminder', authenticate, deleteReminder);

module.exports = router;
