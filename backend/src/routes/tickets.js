const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { saveTicket, getTicketHistory, deleteTicket, getTicketQuota, consumeTicketQuota } = require('../controllers/ticketController');

const router = Router();

router.use(authenticate);

router.get('/history', getTicketHistory);
router.get('/quota', getTicketQuota);
router.post('/quota/consume', consumeTicketQuota);
router.post('/', saveTicket);
router.delete('/:id', deleteTicket);

module.exports = router;
