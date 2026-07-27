const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { usePartnerCode } = require('../controllers/partnerController');

const router = Router();

router.use(authenticate);

router.post('/use/:code', usePartnerCode);

module.exports = router;
