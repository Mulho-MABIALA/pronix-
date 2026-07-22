const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requirePlan } = require('../middleware/subscription');
const { getPersonalCoaching } = require('../services/coachService');

const router = express.Router();

// GET /api/coach/advice — conseils personnalisés basés sur l'historique de pronostics (fonctionnalité Premium)
router.get('/advice', authenticate, requirePlan('PREMIUM'), async (req, res, next) => {
  try {
    const result = await getPersonalCoaching(req.user.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;
