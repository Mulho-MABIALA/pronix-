const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requirePlan } = require('../middleware/subscription');
const {
  createTip, getTipsByMatch, getLeaderboard,
  getTipsterProfile, reportTip, getMyTips,
} = require('../controllers/tipController');
const { generateAiTip } = require('../controllers/aiTipController');

const router = Router();

// Public
router.get('/leaderboard', getLeaderboard);
router.get('/match/:matchId', getTipsByMatch);
router.get('/tipster/:userId', getTipsterProfile);

// Authentifié
router.use(authenticate);
router.get('/my', getMyTips);
router.post('/:tipId/report', reportTip);

// Premium/Pro uniquement
router.post('/', requirePlan('PREMIUM'), createTip);
router.post('/generate-ai', requirePlan('PREMIUM'), generateAiTip);

module.exports = router;
