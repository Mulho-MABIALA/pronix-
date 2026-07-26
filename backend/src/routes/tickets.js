const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { saveTicket, getTicketHistory, deleteTicket } = require('../controllers/ticketController');

const router = Router();

router.use(authenticate);

router.get('/history', getTicketHistory);
router.post('/', saveTicket);
router.delete('/:id', deleteTicket);

module.exports = router;
