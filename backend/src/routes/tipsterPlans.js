const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const {
  upsertPlan,
  getPlan,
  subscribe,
  unsubscribe,
  listSubscribers,
  checkSubscription,
} = require('../controllers/tipsterPlanController');

const router = Router();

// Tipster : créer/modifier son plan
router.post('/', authenticate, upsertPlan);

// Vérifier son abonnement à un tipster (?tipsterId=xxx)
router.get('/mine/status', authenticate, checkSubscription);

// Tipster : voir ses abonnés
router.get('/mine/subscribers', authenticate, listSubscribers);

// Public : voir le plan d'un tipster
router.get('/:tipsterId', getPlan);

// S'abonner / se désabonner
router.post('/:tipsterId/subscribe',    authenticate, subscribe);
router.delete('/:tipsterId/subscribe',  authenticate, unsubscribe);

module.exports = router;
