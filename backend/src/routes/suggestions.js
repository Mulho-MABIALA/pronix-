const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/database');
const { notifyAdmin } = require('../services/adminNotificationService');

const router = express.Router();

// Boîte à idées à sens unique — pas de conversation (voir SupportTicket pour
// le support humain classique). Rate limit large : c'est un simple formulaire,
// pas un canal d'assistance urgent.
const suggestionLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message: { success: false, code: 'RATE_LIMITED', message: 'Trop de suggestions envoyées aujourd\'hui. Réessayez demain.' },
});

// POST /api/suggestions — envoyer une suggestion
router.post('/', authenticate, suggestionLimiter, async (req, res, next) => {
  try {
    const { message } = z.object({ message: z.string().min(5).max(1000) }).parse(req.body);

    const suggestion = await prisma.suggestion.create({
      data: { userId: req.user.id, message },
    });

    notifyAdmin({
      type: 'NEW_SUGGESTION',
      title: 'Nouvelle suggestion',
      message: `${req.user.username} : "${message.slice(0, 100)}${message.length > 100 ? '…' : ''}"`,
      link: '/admin/suggestions',
    });

    res.status(201).json({ success: true, data: suggestion, message: 'Merci pour votre suggestion !' });
  } catch (err) { next(err); }
});

// GET /api/suggestions/mine — suggestions envoyées par l'utilisateur connecté
router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const suggestions = await prisma.suggestion.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: suggestions });
  } catch (err) { next(err); }
});

module.exports = router;
