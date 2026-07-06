const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const {
  initiateWavePayment, handleWaveWebhook,
  initiateCinetpayPayment, handleCinetpayWebhook,
  initiateFedapayPayment, handleFedapayWebhook,
  initiateGeniuspayPayment, handleGeniuspayWebhook,
  verifyPayment,
} = require('../controllers/paymentController');

const router = Router();

// Webhooks (sans authentification — appelés par les providers)
router.post('/wave/webhook',      handleWaveWebhook);
router.post('/cinetpay/webhook',  handleCinetpayWebhook);
router.post('/fedapay/webhook',   handleFedapayWebhook);
router.post('/geniuspay/webhook', handleGeniuspayWebhook);

// Paiements initiés par l'utilisateur (authentifié)
router.use(authenticate);
router.post('/wave/init',      initiateWavePayment);
router.post('/cinetpay/init',  initiateCinetpayPayment);
router.post('/fedapay/init',   initiateFedapayPayment);
router.post('/geniuspay/init', initiateGeniuspayPayment);
router.get('/verify',          verifyPayment);

module.exports = router;
