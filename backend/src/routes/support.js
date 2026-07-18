const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { answerSupportQuestion } = require('../services/supportChatService');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/database');

const router = express.Router();

// Rate limit strict sur le chat support (10 messages / 5 min)
const supportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { success: false, code: 'RATE_LIMITED', message: 'Trop de messages. Réessayez dans 5 minutes.' },
});

// POST /api/support/chat — chatbot IA automatique
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

// POST /api/support/tickets — créer un ticket humain
router.post('/tickets', authenticate, async (req, res, next) => {
  try {
    const schema = z.object({
      subject: z.string().min(3).max(120),
      message: z.string().min(10).max(2000),
    });
    const { subject, message } = schema.parse(req.body);

    const ticket = await prisma.supportTicket.create({
      data: {
        userId:  req.user.id,
        email:   req.user.email,
        subject,
        messages: { create: { isAdmin: false, content: message } },
      },
      include: { messages: true },
    });

    res.status(201).json({ success: true, data: ticket, message: 'Ticket soumis. L\'équipe vous répondra sous 24h.' });
  } catch (err) { next(err); }
});

// GET /api/support/tickets/mine — tickets de l'utilisateur connecté
router.get('/tickets/mine', authenticate, async (req, res, next) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: tickets });
  } catch (err) { next(err); }
});

module.exports = router;
