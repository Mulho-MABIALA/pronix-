const { Router } = require('express');
const { subscribe, unsubscribe, getPublicKey } = require('../controllers/pushController');

const router = Router();

router.get('/vapid-public-key', getPublicKey);
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);

module.exports = router;
