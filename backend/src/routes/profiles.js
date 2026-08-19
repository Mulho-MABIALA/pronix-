const { Router } = require('express');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/database');
const env = require('../config/env');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { REFRESH_COOKIE, clearAuthCookies } = require('../config/cookies');
const { notifyAdmin } = require('../services/adminNotificationService');
const { sendEmailVerification } = require('../services/emailService');

const router = Router();
router.use(authenticate);

// Mise à jour du profil
router.patch('/me', async (req, res, next) => {
  try {
    const schema = z.object({
      displayName: z.string().max(50).optional(),
      bio: z.string().max(300).optional(),
      // Le numéro doit toujours inclure son indicatif (ex: "+221771234567") —
      // le frontend force le choix d'un indicatif dans un select dédié, on
      // revalide le format ici pour ne jamais accepter un numéro sans le "+".
      phone: z.string().regex(/^\+[1-9]\d{5,14}$/, 'Le numéro doit inclure l\'indicatif (ex: +221771234567)').optional().nullable(),
      // avatar : URL externe (Google) ou data:image base64 (upload local, max ~180 KB)
      avatar: z.string().max(250000).optional().nullable(),
      favoriteTeams: z.array(z.string()).max(10).optional(),
      favoriteLeagues: z.array(z.string()).max(10).optional(),
      notifEmail: z.boolean().optional(),
      notifSms: z.boolean().optional(),
    });
    const data = schema.parse(req.body);

    const profile = await prisma.profile.update({
      where: { userId: req.user.id },
      data,
    });
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// Marquer l'onboarding comme terminé
router.post('/me/onboarding', async (req, res, next) => {
  try {
    const schema = z.object({
      favoriteTeams: z.array(z.string()).max(10).default([]),
      favoriteLeagues: z.array(z.string()).max(10).default([]),
      // Langue principale + devise préférée + pays choisis à l'onboarding (ciblage mondial)
      language: z.enum(['fr', 'en', 'es', 'pt']).optional(),
      currency: z.enum(['FCFA', 'EUR', 'USD', 'GBP', 'BRL', 'MXN', 'CAD', 'ZAR']).optional(),
      country:  z.string().min(2).max(10).optional(),
    });
    const { favoriteTeams, favoriteLeagues, language, currency, country } = schema.parse(req.body);

    const [profile] = await prisma.$transaction([
      prisma.profile.update({
        where: { userId: req.user.id },
        data: { favoriteTeams, favoriteLeagues, onboardingDone: true },
      }),
      prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(language && { language }),
          ...(currency && { currency }),
          ...(country && { country }),
        },
      }),
    ]);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// Préférences localisation (pays / langue / devise) — éditables depuis la page
// Profil, séparé de /me/onboarding qui touche aussi les favoris.
router.patch('/me/preferences', async (req, res, next) => {
  try {
    const schema = z.object({
      language: z.enum(['fr', 'en', 'es', 'pt']).optional(),
      currency: z.enum(['FCFA', 'EUR', 'USD', 'GBP', 'BRL', 'MXN', 'CAD', 'ZAR']).optional(),
      country:  z.string().min(2).max(10).optional(),
    });
    const { language, currency, country } = schema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(language && { language }),
        ...(currency && { currency }),
        ...(country && { country }),
      },
    });
    const { password: _, ...userSafe } = user;
    res.json({ success: true, data: userSafe });
  } catch (err) {
    next(err);
  }
});

// Changer le mot de passe (utilisateur déjà authentifié — différent du flow
// "mot de passe oublié" qui passe par un email). Si le compte n'a pas encore
// de mot de passe (créé via Google), aucune vérification de l'ancien n'est
// exigée — même logique que la suppression de compte ci-dessous.
router.patch('/me/password', async (req, res, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string().optional(),
      newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(100),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);

    if (req.user.password) {
      if (!currentPassword) {
        throw new AppError('Mot de passe actuel requis', 400, 'PASSWORD_REQUIRED');
      }
      const isValid = await bcrypt.compare(currentPassword, req.user.password);
      if (!isValid) {
        throw new AppError('Mot de passe actuel incorrect', 401, 'INVALID_PASSWORD');
      }
    }

    const hashed = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    res.json({ success: true, message: 'Mot de passe mis à jour' });
  } catch (err) {
    next(err);
  }
});

// Changer l'adresse email et/ou le mot de passe (utilisateur déjà
// authentifié), en une seule soumission — le mot de passe actuel confirme
// l'identité dans les deux cas, donc autant regrouper les deux actions
// plutôt que de les séparer en deux formulaires distincts.
// newPassword est optionnel : si absent, seul l'email change. Si newEmail
// est identique à l'email actuel, seul le mot de passe change (pas d'erreur
// SAME_EMAIL dans ce cas — on ne force plus à toujours changer l'email).
// Un changement d'email repasse emailVerified à false et renvoie un lien de
// vérification vers la nouvelle adresse — jamais vers l'ancienne.
router.patch('/me/email', async (req, res, next) => {
  try {
    const schema = z.object({
      newEmail: z.string().email('Adresse email invalide'),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(100).optional(),
    });
    const { newEmail, currentPassword, newPassword } = schema.parse(req.body);
    const emailLower = newEmail.toLowerCase().trim();
    const emailChanged = emailLower !== req.user.email.toLowerCase();

    if (!emailChanged && !newPassword) {
      throw new AppError('Rien à modifier', 400, 'NOTHING_TO_UPDATE');
    }

    if (req.user.password) {
      if (!currentPassword) {
        throw new AppError('Mot de passe actuel requis', 400, 'PASSWORD_REQUIRED');
      }
      const isValid = await bcrypt.compare(currentPassword, req.user.password);
      if (!isValid) {
        throw new AppError('Mot de passe actuel incorrect', 401, 'INVALID_PASSWORD');
      }
    }

    if (emailChanged) {
      const existing = await prisma.user.findUnique({ where: { email: emailLower } });
      if (existing && existing.id !== req.user.id) {
        throw new AppError('Cette adresse email est déjà utilisée', 409, 'EMAIL_TAKEN');
      }
    }

    const data = {};
    if (emailChanged) { data.email = emailLower; data.emailVerified = false; }
    if (newPassword) { data.password = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS); }

    const user = await prisma.user.update({ where: { id: req.user.id }, data });

    if (emailChanged) {
      // Best-effort : un échec d'envoi ne doit pas annuler le changement d'email.
      const token = crypto.randomBytes(32).toString('hex');
      prisma.emailVerification.create({
        data: { userId: user.id, token, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      }).then(() => sendEmailVerification(user, token)).catch((err) => console.error('[EmailVerification] échec envoi:', err.message || err));
    }

    const { password: _, ...userSafe } = user;
    res.json({ success: true, data: userSafe, emailChanged, passwordChanged: !!newPassword });
  } catch (err) {
    next(err);
  }
});

// Jeu responsable : pause auto-imposée. Bloque la génération de tickets et
// l'initiation de paiement (voir middleware/auth.js#blockIfSelfExcluded)
// jusqu'à la date choisie. Volontairement pas de route pour annuler la pause
// avant son terme — sinon elle perd tout son sens comme garde-fou.
router.post('/me/self-exclusion', async (req, res, next) => {
  try {
    const { days } = z.object({
      days: z.number().int().refine((v) => [1, 7, 30].includes(v), {
        message: 'Durée invalide (1, 7 ou 30 jours uniquement)',
      }),
    }).parse(req.body);

    const already = req.user.selfExclusionUntil && new Date(req.user.selfExclusionUntil) > new Date();
    if (already) {
      throw new AppError('Une pause est déjà active sur ton compte', 409, 'SELF_EXCLUSION_ACTIVE');
    }

    const until = new Date();
    until.setDate(until.getDate() + days);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { selfExclusionUntil: until },
    });

    const { password: _, ...userSafe } = user;
    res.json({ success: true, data: userSafe });
  } catch (err) {
    next(err);
  }
});

// Suppression définitive du compte (self-service)
router.delete('/me', async (req, res, next) => {
  try {
    // Compte avec mot de passe (non-Google) : on exige le mot de passe actuel
    if (req.user.password) {
      const { password } = z.object({ password: z.string().min(1) }).parse(req.body || {});
      const isValid = await bcrypt.compare(password, req.user.password);
      if (!isValid) {
        throw new AppError('Mot de passe incorrect', 401, 'INVALID_PASSWORD');
      }
    }

    // On garde username/email avant suppression : plus rien à lire une fois le compte parti.
    const { username, email } = req.user;

    await prisma.user.delete({ where: { id: req.user.id } });

    // Historique admin (table dédiée, indépendante du compte qui vient de disparaître)
    prisma.deletedAccount.create({ data: { email, username, reason: 'self' } })
      .catch((err) => console.error('[DeletedAccount] échec création:', err.message || err));

    // Un compte supprimé ne doit plus recevoir la newsletter — best-effort, ne
    // doit jamais faire échouer la suppression du compte elle-même.
    prisma.newsletterSubscriber.updateMany({
      where: { email: email.toLowerCase(), isActive: true },
      data: { isActive: false, unsubscribedAt: new Date() },
    }).catch((err) => console.error('[Newsletter] désinscription auto échouée:', err.message || err));

    notifyAdmin({
      type: 'ACCOUNT_DELETED',
      title: 'Compte supprimé',
      message: `${username} (${email}) a supprimé son compte lui-même.`,
      link: '/admin/utilisateurs',
    });

    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await prisma.refreshToken.deleteMany({ where: { token } });
    clearAuthCookies(res);

    res.json({ success: true, message: 'Compte supprimé définitivement' });
  } catch (err) {
    if (err.code === 'P2025') {
      return next(new AppError('Compte introuvable', 404, 'NOT_FOUND'));
    }
    const msg = (err.message || '').toLowerCase();
    const isRestrictViolation =
      err.code === 'P2003' || err.code === 'P2014' ||
      msg.includes('23001') || msg.includes('foreign key constraint') || msg.includes('violates restrict');
    if (isRestrictViolation) {
      return next(new AppError(
        "Suppression impossible : ton compte a des paiements ou signalements enregistrés (historique conservé pour raisons légales/comptables). Contacte le support pour une suppression manuelle.",
        409,
        'DELETE_BLOCKED'
      ));
    }
    next(err);
  }
});

// Gestion des favoris (équipe, ligue, tipster)
router.post('/me/favorites', async (req, res, next) => {
  try {
    const schema = z.object({
      type: z.enum(['team', 'league', 'tipster']),
      externalId: z.string(),
      name: z.string(),
      logo: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const fav = await prisma.favorite.upsert({
      where: { userId_type_externalId: { userId: req.user.id, type: data.type, externalId: data.externalId } },
      update: {},
      create: { userId: req.user.id, ...data },
    });
    res.json({ success: true, data: fav });
  } catch (err) {
    next(err);
  }
});

router.delete('/me/favorites/:type/:externalId', async (req, res, next) => {
  try {
    await prisma.favorite.deleteMany({
      where: { userId: req.user.id, type: req.params.type, externalId: req.params.externalId },
    });
    res.json({ success: true, message: 'Favori supprimé' });
  } catch (err) {
    next(err);
  }
});

router.get('/me/favorites', async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: favorites });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
