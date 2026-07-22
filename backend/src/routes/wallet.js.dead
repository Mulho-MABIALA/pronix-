const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getMyWallet, placeBet, listBets, getLeaderboard } = require('../controllers/walletController');

const router = express.Router();

router.get('/me', authenticate, getMyWallet);
router.get('/leaderboard', getLeaderboard);
router.get('/bets', authenticate, listBets);
router.post('/bets', authenticate, placeBet);

module.exports = router;
