const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/database');
const { notifyAdmin } = require('../services/adminNotificationService');

const router = express.Router();

// Fréquence du popup avis (étoiles + commentaire) : 1x/mois par utilisateur.
// Compte aussi bien un avis soumis qu'un popup ignoré ("plus tard") — voir
// User.lastReviewPromptAt, mis à jour dans les deux cas.
const REVIEW_PROMPT_INTERVAL_DAYS = 30;
// On laisse le compte "vivre" quelques jours avant de demander un avis —
// évite de solliciter un utilisateur qui vient tout juste de s'inscrire.
const MIN_ACCOUNT_AGE_DAYS = 3;

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function isEligible(user) {
  if (user.createdAt > daysAgo(MIN_ACCOUNT_AGE_DAYS)) return false;
  if (!user.lastReviewPromptAt) return true;
  return user.lastReviewPromptAt < daysAgo(REVIEW_PROMPT_INTERVAL_DAYS);
}

const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, code: 'RATE_LIMITED', message: 'Trop de requêtes. Réessayez plus tard.' },
});

// GET /api/reviews/should-prompt — le frontend vérifie l'éligibilité au montage
router.get('/should-prompt', authenticate, async (req, res, next) => {
  try {
    res.json({ success: true, data: { shouldPrompt: isEligible(req.user) } });
  } catch (err) { next(err); }
});

// POST /api/reviews — soumettre un avis (étoiles + commentaire optionnel)
router.post('/', authenticate, reviewLimiter, async (req, res, next) => {
  try {
    // Re-vérifié côté serveur : le popup ne doit pas pouvoir être spammé même
    // en appelant l'API directement, indépendamment de ce qu'affiche le frontend.
    if (!isEligible(req.user)) {
      return res.status(429).json({ success: false, code: 'ALREADY_PROMPTED', message: 'Avis déjà donné récemment.' });
    }

    const { rating, comment } = z.object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(1000).optional().nullable(),
    }).parse(req.body);

    const [review] = await prisma.$transaction([
      prisma.appReview.create({ data: { userId: req.user.id, rating, comment: comment || null } }),
      prisma.user.update({ where: { id: req.user.id }, data: { lastReviewPromptAt: new Date() } }),
    ]);

    // Une note basse mérite un suivi humain — pas de bruit pour les bonnes notes.
    if (rating <= 2) {
      notifyAdmin({
        type: 'LOW_APP_REVIEW',
        title: `Avis ${rating}/5 reçu`,
        message: `${req.user.username}${comment ? ` : "${comment.slice(0, 150)}${comment.length > 150 ? '…' : ''}"` : ' (sans commentaire)'}`,
        link: '/admin/avis',
      });
    }

    res.status(201).json({ success: true, data: review, message: 'Merci pour votre avis !' });
  } catch (err) { next(err); }
});

// POST /api/reviews/dismiss — popup ignoré ("plus tard") : on repousse quand
// même la prochaine sollicitation pour ne pas être insistant.
router.post('/dismiss', authenticate, async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.user.id }, data: { lastReviewPromptAt: new Date() } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
