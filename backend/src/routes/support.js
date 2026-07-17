const express = require('express');
const rateLimit = require('express-rate-limit');
const { answerSupportQuestion } = require('../services/supportChatService');

const router = express.Router();

// Rate limit strict sur le chat support (10 messages / 5 min)
const supportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { success: false, code: 'RATE_LIMITED', message: 'Trop de messages. Réessayez dans 5 minutes.' },
});

// POST /api/support/chat
router.post('/chat', supportLimiter, async (req, res, next) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Message requis.' });
    }
    const result = await answerSupportQuestion(message.slice(0, 500), history || []);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;
