const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, blockIfSelfExcluded } = require('../middleware/auth');
const {
  initiateWavePayment, handleWaveWebhook,
  initiatePaytechPayment, handlePaytechWebhook,
  initiateTipsterPaytechPayment,
  initiateFedapayPayment, handleFedapayWebhook,
  initiateFlutterwavePayment, handleFlutterwaveWebhook,
  initiateTipsterFlutterwavePayment,
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
router.post('/wave/webhook',       handleWaveWebhook);
router.post('/paytech/webhook',    handlePaytechWebhook);
router.post('/fedapay/webhook',    handleFedapayWebhook);
router.post('/flutterwave/webhook', handleFlutterwaveWebhook);

// Paiements initiés par l'utilisateur (authentifié)
router.use(authenticate);
router.post('/wave/init',      paymentLimit, blockIfSelfExcluded, initiateWavePayment);
router.post('/paytech/init',   paymentLimit, blockIfSelfExcluded, initiatePaytechPayment);
router.post('/fedapay/init',   paymentLimit, blockIfSelfExcluded, initiateFedapayPayment);
// Abonnement payant à un tipster (même provider PayTech, webhook partagé)
router.post('/tipster/paytech/init', paymentLimit, blockIfSelfExcluded, initiateTipsterPaytechPayment);
// Flutterwave — carte internationale / devise étrangère (second processeur)
router.post('/flutterwave/init',        paymentLimit, blockIfSelfExcluded, initiateFlutterwavePayment);
router.post('/tipster/flutterwave/init', paymentLimit, blockIfSelfExcluded, initiateTipsterFlutterwavePayment);
router.get('/verify',          verifyPayment);

module.exports = router;
