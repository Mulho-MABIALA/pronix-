const express = require('express');
const { authenticate, requireAdmin, optionalAuthenticate } = require('../middleware/auth');
const { logEvent, getStats, getTipsterAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

router.post('/log', optionalAuthenticate, logEvent);
router.get('/stats', authenticate, requireAdmin, getStats);
router.get('/tipster/:id', authenticate, requireAdmin, getTipsterAnalytics);

module.exports = router;
