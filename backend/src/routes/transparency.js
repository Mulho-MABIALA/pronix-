const { Router } = require('express');
const { getTransparencyStats } = require('../controllers/transparencyController');

const router = Router();

// Public — aucune authentification requise
router.get('/', getTransparencyStats);

module.exports = router;
