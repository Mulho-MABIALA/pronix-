const express = require('express');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { createCombo, listCombos, getCombo, deleteCombo, myСombos } = require('../controllers/comboController');
const { optimizeCombo } = require('../services/comboOptimizerService');

const router = express.Router();

router.get('/', optionalAuthenticate, listCombos);
router.post('/', authenticate, createCombo);
router.get('/my', authenticate, myСombos);

// POST /combos/optimize — IA suggère les meilleurs picks pour une liste de matchs
router.post('/optimize', authenticate, async (req, res, next) => {
  try {
    const { matchIds, strategy } = req.body;
    if (!Array.isArray(matchIds) || matchIds.length < 2) {
      return res.status(400).json({ success: false, message: 'Au moins 2 matchIds requis.' });
    }
    const result = await optimizeCombo(matchIds.slice(0, 15), strategy || 'balanced');
    res.json({ success: result.success, data: result });
  } catch (err) { next(err); }
});

router.get('/:id', optionalAuthenticate, getCombo);
router.delete('/:id', authenticate, deleteCombo);

module.exports = router;
