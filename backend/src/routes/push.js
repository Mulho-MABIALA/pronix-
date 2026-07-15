const { Router } = require('express');
const { subscribe, unsubscribe, getPublicKey } = require('../controllers/pushController');
const { optionalAuthenticate } = require('../middleware/auth');

const router = Router();

router.get('/vapid-public-key', getPublicKey);
router.post('/subscribe', optionalAuthenticate, subscribe);
router.post('/unsubscribe', unsubscribe);

module.exports = router;
