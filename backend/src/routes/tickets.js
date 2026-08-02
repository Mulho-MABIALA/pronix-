const { Router } = require('express');
const { authenticate, blockIfSelfExcluded } = require('../middleware/auth');
const { saveTicket, getTicketHistory, deleteTicket, getTicketQuota, consumeTicketQuota } = require('../controllers/ticketController');

const router = Router();

router.use(authenticate);

router.get('/history', getTicketHistory);
router.get('/quota', getTicketQuota);
router.post('/quota/consume', blockIfSelfExcluded, consumeTicketQuota);
router.post('/', blockIfSelfExcluded, saveTicket);
router.delete('/:id', deleteTicket);

module.exports = router;
