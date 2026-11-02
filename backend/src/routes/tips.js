const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requirePlan, attachPlan } = require('../middleware/subscription');
const {
  createTip, getTipsByMatch, getLeaderboard,
  getTipsterProfile, getTipsterWeeklyStats, reportTip, getMyTips,
} = require('../controllers/tipController');
const { generateAiTip } = require('../controllers/aiTipController');
const { requireFeature } = require('../middleware/features');
const tipstersOn = requireFeature('tipsters');

const router = Router();

// Public — top 20 en accès libre, classement complet réservé Premium (cf. controller)
router.get('/leaderboard', tipstersOn, (req, res, next) => {
  if (req.headers.authorization) {
    return authenticate(req, res, () => attachPlan(req, res, () => getLeaderboard(req, res, next)));
  }
  attachPlan(req, res, () => getLeaderboard(req, res, next));
});
router.get('/match/:matchId', getTipsByMatch);
router.get('/tipster/:userId', tipstersOn, getTipsterProfile);
router.get('/tipster/:userId/weekly-stats', tipstersOn, getTipsterWeeklyStats);

// Authentifié
router.use(authenticate);
router.get('/my', tipstersOn, getMyTips);
router.post('/:tipId/report', tipstersOn, reportTip);

// Publication ouverte à tous les inscrits
router.post('/', tipstersOn, createTip);
// Génération IA réservée Premium/Pro
router.post('/generate-ai', requirePlan('PREMIUM'), generateAiTip);

module.exports = router;
