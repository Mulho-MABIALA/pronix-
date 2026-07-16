const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { getMyCode, useReferralCode, getMyReferrals } = require('../controllers/referralController');

const router = Router();

router.use(authenticate);

router.get('/my-code', getMyCode);
router.get('/list', getMyReferrals);
router.post('/use/:code', useReferralCode);

module.exports = router;
