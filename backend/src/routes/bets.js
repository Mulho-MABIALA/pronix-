const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { getBets, createBet, updateBet, deleteBet } = require('../controllers/betsController');

const router = Router();

router.use(authenticate);

router.get('/', getBets);
router.post('/', createBet);
router.patch('/:id', updateBet);
router.delete('/:id', deleteBet);

module.exports = router;
