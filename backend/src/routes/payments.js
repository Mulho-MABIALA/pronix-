const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, blockIfSelfExcluded } = require('../middleware/auth');
const {
  initiateWavePayment, handleWaveWebhook,
  initiateCinetpayPayment, handleCinetpayWebhook,
  initiateFedapayPayment, handleFedapayWebhook,
  // GeniusPay — mis de côté (remplacé par PayDunya), import conservé pour réactivation future
  initiateGeniuspayPayment, handleGeniuspayWebhook,
  initiatePaydunyaPayment, handlePaydunyaWebhook,
  initiateTipsterPaydunyaPayment,
  verifyPayment,
} = require('../controllers/paymentController');

const router = Router();

// Rate limit strict sur l'initiation de paiement (3 tentatives/10min par IP)
const paymentLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: { success: false, code: 'RATE_LIMITED', message: 'Trop de tentatives de paiement. Réessayez dans 10 minutes.' },
});

// Webhooks (sans authentification — appelés par les providers)
router.post('/wave/webhook',      handleWaveWebhook);
router.post('/cinetpay/webhook',  handleCinetpayWebhook);
router.post('/fedapay/webhook',   handleFedapayWebhook);
// GeniusPay — mis de côté (remplacé par PayDunya). Code conservé, route désactivée :
// router.post('/geniuspay/webhook', handleGeniuspayWebhook);
router.post('/paydunya/webhook',  handlePaydunyaWebhook);

// Paiements initiés par l'utilisateur (authentifié)
router.use(authenticate);
router.post('/wave/init',      paymentLimit, blockIfSelfExcluded, initiateWavePayment);
router.post('/cinetpay/init',  paymentLimit, blockIfSelfExcluded, initiateCinetpayPayment);
router.post('/fedapay/init',   paymentLimit, blockIfSelfExcluded, initiateFedapayPayment);
// GeniusPay — mis de côté (remplacé par PayDunya). Code conservé, route désactivée :
// router.post('/geniuspay/init', paymentLimit, blockIfSelfExcluded, initiateGeniuspayPayment);
router.post('/paydunya/init',  paymentLimit, blockIfSelfExcluded, initiatePaydunyaPayment);
// Abonnement payant à un tipster (même provider PayDunya, webhook partagé)
router.post('/tipster/paydunya/init', paymentLimit, blockIfSelfExcluded, initiateTipsterPaydunyaPayment);
router.get('/verify',          verifyPayment);

module.exports = router;
