const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { getPlans, getMySubscription } = require('../controllers/subscriptionController');

const router = Router();

router.get('/plans', getPlans);
router.get('/me', authenticate, getMySubscription);

module.exports = router;
