const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../config/database');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');
const { sendWelcomeEmail, sendPasswordResetEmail, sendEmailVerification } = require('../services/emailService');
const { REFRESH_COOKIE, setAuthCookies, clearAuthCookies } = require('../config/cookies');
const { notifyAdmin } = require('../services/adminNotificationService');

// Inscrit automatiquement tout nouveau compte à la newsletter (source "signup").
// Non bloquant : une erreur ici ne doit jamais faire échouer l'inscription.
async function autoSubscribeToNewsletter(user, source = 'signup') {
  try {
    const email = user.email.toLowerCase();
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {}, // déjà présent (ex: désinscrit) → on ne réactive pas de force
      create: { email, language: user.language || 'fr', source, isActive: true },
    });
  } catch (err) {
    console.error('[Newsletter] auto-subscribe échoué (non bloquant):', err.message || err);
  }
}

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// ─── Schémas de validation ──────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe min. 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir une majuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir un chiffre'),
  // Le pseudo n'est jamais utilisé comme URL/slug/identifiant technique (tout
  // passe par user.id) — donc pas de raison de le restreindre à [a-zA-Z0-9_].
  // On autorise lettres (accents compris), chiffres, espaces, apostrophes et
  // tirets, en évitant juste les espaces en double et les valeurs vides.
  username: z.string()
    .trim()
    .min(3, 'Pseudo min. 3 caractères')
    .max(30, 'Pseudo max. 30 caractères')
    .regex(/^[\p{L}\p{N} '_-]+$/u, 'Pseudo : lettres, chiffres, espaces, apostrophes et tirets uniquement')
    .refine((v) => !/\s{2,}/.test(v), { message: 'Pseudo : un seul espace consécutif autorisé' }),
  language: z.enum(['fr', 'en', 'es', 'pt']).default('fr'),
  currency: z.enum(['FCFA', 'EUR', 'USD', 'GBP', 'BRL', 'MXN', 'CAD', 'ZAR']).nullable().optional(),
  // Jeu responsable : case à cocher obligatoire, jamais pré-cochée côté client.
  ageConfirmed: z.boolean().refine((v) => v === true, {
    message: 'Tu dois confirmer avoir 18 ans ou plus pour créer un compte',
  }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Helpers JWT ────────────────────────────────────────────────────────────
function generateAccessToken(userId) {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

// Jeton d'étape intermédiaire (step-up) : émis quand un compte ADMIN vient de
// réussir l'étape mot de passe mais doit encore confirmer via passkey avant
// qu'une vraie session ne soit ouverte. Courte durée de vie, usage unique
// côté flux (consommé par webauthnController.adminStepUpVerify), signé avec
// le même secret que les access tokens mais un "purpose" dédié pour ne pas
// pouvoir être confondu avec un vrai access token.
function generateStepUpToken(userId) {
  return jwt.sign({ sub: userId, purpose: 'admin_step_up' }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function getRefreshExpiryDate() {
  const days = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// Fin de l'essai gratuit : 7 jours après l'inscription
function getTrialEndDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

// ─── Helper : username unique depuis email Google ────────────────────────────
async function generateUniqueUsername(email) {
  const base = email.split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 20) || 'user';
  let username = base;
  let counter = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}${counter}`;
    counter++;
  }
  return username;
}

// ─── Inscription ─────────────────────────────────────────────────────────────
async function register(req, res, next) {
  try {
    const { email, password, username, language, currency } = registerSchema.parse(req.body);

    const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    const freePlan = await prisma.plan.findUnique({ where: { code: 'FREE' } });
    if (!freePlan) {
      throw new AppError('Plan gratuit introuvable. Contactez l\'administrateur.', 500, 'FREE_PLAN_MISSING');
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        language,
        currency: currency || null,
        ageConfirmedAt: new Date(),
        lastLoginAt: new Date(),
        trialEndsAt: getTrialEndDate(), // essai Premium 7 jours
        profile: { create: {} },
        subscription: {
          create: {
            planId: freePlan.id,
            status: 'ACTIVE',
          },
        },
      },
      include: { profile: true, subscription: { include: { plan: true } } },
    });

    sendWelcomeEmail(user).catch(console.error);
    autoSubscribeToNewsletter(user, 'signup');
    notifyAdmin({
      type: 'NEW_USER',
      title: 'Nouvel utilisateur',
      message: `${user.username} (${user.email}) vient de s'inscrire.`,
      link: '/admin/utilisateurs',
    });

    const accessToken = generateAccessToken(user.id);
    const refreshTokenValue = generateRefreshToken();
    const refreshExpiresAt = getRefreshExpiryDate();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: refreshExpiresAt,
      },
    });

    setAuthCookies(res, { accessToken, refreshToken: refreshTokenValue, refreshExpiresAt });

    const { password: _, ...userSafe } = user;
    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: { user: userSafe },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Connexion ───────────────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true, subscription: { include: { plan: true } } },
    });

    if (!user || !user.isActive) {
      throw new AppError('Email ou mot de passe incorrect', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.password) {
      throw new AppError('Ce compte utilise la connexion Google. Cliquez sur "Continuer avec Google".', 401, 'GOOGLE_AUTH_REQUIRED');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError('Email ou mot de passe incorrect', 401, 'INVALID_CREDENTIALS');
    }

    // Sécurité renforcée pour les comptes ADMIN : si une passkey est déjà
    // enregistrée, le mot de passe seul ne suffit pas à ouvrir une session —
    // on exige une confirmation biométrique (voir webauthnController
    // adminStepUpOptions/Verify). Aucune session n'est ouverte à ce stade, on
    // renvoie juste un jeton d'étape de courte durée.
    let adminPasskeyCount = 0;
    if (user.role === 'ADMIN') {
      adminPasskeyCount = await prisma.webAuthnCredential.count({ where: { userId: user.id } });
      if (adminPasskeyCount > 0) {
        return res.json({
          success: true,
          code: 'PASSKEY_REQUIRED',
          data: { stepUpToken: generateStepUpToken(user.id) },
        });
      }
    }

    const accessToken = generateAccessToken(user.id);
    const refreshTokenValue = generateRefreshToken();
    const refreshExpiresAt = getRefreshExpiryDate();
    await prisma.$transaction([
      prisma.refreshToken.create({
        data: { userId: user.id, token: refreshTokenValue, expiresAt: refreshExpiresAt },
      }),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    ]);

    setAuthCookies(res, { accessToken, refreshToken: refreshTokenValue, refreshExpiresAt });

    const { password: _, ...userSafe } = user;
    res.json({
      success: true,
      data: {
        user: {
          ...userSafe,
          // Nudge frontend : admin sans passkey enregistrée → proposer d'en ajouter une.
          requiresPasskeySetup: user.role === 'ADMIN' && adminPasskeyCount === 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Renouvellement du token ─────────────────────────────────────────────────
// Le refresh token est lu depuis le cookie httpOnly (path /api/auth), plus
// depuis le corps de la requête — le frontend n'a plus besoin de le transmettre.
async function refreshToken(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw new AppError('Refresh token manquant', 401, 'INVALID_REFRESH_TOKEN');
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { subscription: { include: { plan: true } }, profile: true } } },
    });

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      clearAuthCookies(res);
      throw new AppError('Refresh token invalide ou expiré', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Rotation du refresh token (sécurité) + mise à jour lastLoginAt
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const newRefreshToken = generateRefreshToken();
    const refreshExpiresAt = getRefreshExpiryDate();
    await prisma.$transaction([
      prisma.refreshToken.create({
        data: { userId: stored.userId, token: newRefreshToken, expiresAt: refreshExpiresAt },
      }),
      prisma.user.update({ where: { id: stored.userId }, data: { lastLoginAt: new Date() } }),
    ]);

    const accessToken = generateAccessToken(stored.userId);
    setAuthCookies(res, { accessToken, refreshToken: newRefreshToken, refreshExpiresAt });

    const { password: _, ...userSafe } = stored.user;
    res.json({
      success: true,
      data: { user: userSafe },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Déconnexion ─────────────────────────────────────────────────────────────
async function logout(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }
    clearAuthCookies(res);
    res.json({ success: true, message: 'Déconnecté avec succès' });
  } catch (err) {
    next(err);
  }
}

// ─── Demande de réinitialisation de mot de passe ──────────────────────────────
async function forgotPassword(req, res, next) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    // Réponse identique même si l'email n'existe pas (évite l'énumération)
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      await prisma.passwordReset.create({ data: { userId: user.id, token, expiresAt } });
      sendPasswordResetEmail(user, token).catch(console.error);
    }

    res.json({ success: true, message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
  } catch (err) {
    next(err);
  }
}

// ─── Réinitialisation du mot de passe ────────────────────────────────────────
async function resetPassword(req, res, next) {
  try {
    const { token, password } = z.object({
      token: z.string(),
      password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
    }).parse(req.body);

    const reset = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!reset || reset.used || reset.expiresAt < new Date()) {
      throw new AppError('Lien de réinitialisation invalide ou expiré', 400, 'INVALID_RESET_TOKEN');
    }

    const hashed = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { password: hashed } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
      prisma.refreshToken.deleteMany({ where: { userId: reset.userId } }),
    ]);

    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    next(err);
  }
}

// ─── Connexion / Inscription via Google ─────────────────────────────────────
async function googleAuth(req, res, next) {
  try {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError('Google OAuth non configuré', 500, 'GOOGLE_NOT_CONFIGURED');
    }

    const { credential, ageConfirmed } = z.object({
      credential: z.string(),
      ageConfirmed: z.boolean().optional(),
    }).parse(req.body);

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
    } catch {
      throw new AppError('Token Google invalide ou expiré', 401, 'INVALID_GOOGLE_TOKEN');
    }

    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    if (!email) {
      throw new AppError('Impossible de récupérer l\'email depuis Google', 400, 'GOOGLE_NO_EMAIL');
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true, subscription: { include: { plan: true } } },
    });

    if (user) {
      if (!user.isActive) {
        throw new AppError('Compte désactivé', 403, 'ACCOUNT_DISABLED');
      }
      // Lier le googleId si ce n'est pas encore fait, et dans tous les cas
      // mettre à jour lastLoginAt — sinon "Dernier login" reste vide pour
      // tout compte connecté via Google (bug : jamais mis à jour ici avant).
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), ...(user.googleId ? {} : { googleId }) },
      });
    } else {
      // Créer un nouveau compte via Google — jeu responsable : la case 18+ doit
      // avoir été cochée côté client avant l'appel (voir Register.jsx).
      if (!ageConfirmed) {
        throw new AppError('Tu dois confirmer avoir 18 ans ou plus pour créer un compte', 400, 'AGE_CONFIRMATION_REQUIRED');
      }

      const username = await generateUniqueUsername(email);
      const freePlan = await prisma.plan.findUnique({ where: { code: 'FREE' } });

      user = await prisma.user.create({
        data: {
          email,
          googleId,
          username,
          ageConfirmedAt: new Date(),
          lastLoginAt: new Date(),
          trialEndsAt: getTrialEndDate(), // essai Premium 7 jours
          profile: { create: { displayName: name || username, avatar: picture } },
          subscription: { create: { planId: freePlan.id, status: 'ACTIVE' } },
        },
        include: { profile: true, subscription: { include: { plan: true } } },
      });

      sendWelcomeEmail(user).catch(console.error);
      autoSubscribeToNewsletter(user, 'signup_google');
      notifyAdmin({
        type: 'NEW_USER',
        title: 'Nouvel utilisateur',
        message: `${user.username} (${user.email}) vient de s'inscrire via Google.`,
        link: '/admin/utilisateurs',
      });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshTokenValue = generateRefreshToken();
    const refreshExpiresAt = getRefreshExpiryDate();
    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshTokenValue, expiresAt: refreshExpiresAt },
    });

    setAuthCookies(res, { accessToken, refreshToken: refreshTokenValue, refreshExpiresAt });

    const { password: _, ...userSafe } = user;
    res.json({
      success: true,
      data: { user: userSafe },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Profil de l'utilisateur connecté ────────────────────────────────────────
async function me(req, res) {
  const { password: _, ...userSafe } = req.user;
  // Le hash n'est jamais renvoyé, mais le frontend a besoin de savoir si un
  // mot de passe existe (compte Google pur vs compte avec mot de passe défini)
  // pour savoir si l'ancien mot de passe doit être demandé avant d'en changer.
  res.json({ success: true, data: { ...userSafe, hasPassword: !!_ } });
}

// ─── Marquer l'app comme installée (PWA) ─────────────────────────────────────
async function markAppInstalled(req, res, next) {
  try {
    // On réécrit systématiquement la date à chaque appel (throttlé à 1x/jour
    // côté frontend, voir usePWAInstall.js) — appInstalledAt représente donc
    // la dernière fois qu'on a confirmé l'app ouverte en mode standalone, pas
    // la toute première installation. Ça permet de détecter indirectement une
    // désinstallation : si la date arrête d'avancer, l'app n'est plus utilisée
    // en mode installé (désinstallée, ou juste jamais réouverte depuis).
    await prisma.user.update({
      where: { id: req.user.id },
      data: { appInstalledAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── Envoi de l'email de vérification ────────────────────────────────────────
async function sendVerificationEmail(req, res, next) {
  try {
    if (req.user.emailVerified) {
      return res.json({ success: true, message: 'Email déjà vérifié' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.emailVerification.create({
      data: { userId: req.user.id, token, expiresAt },
    });

    await sendEmailVerification(req.user, token);

    res.json({ success: true, message: 'Email de vérification envoyé' });
  } catch (err) {
    next(err);
  }
}

// ─── Vérification du token ────────────────────────────────────────────────────
async function verifyEmail(req, res, next) {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.params);

    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification || verification.used || verification.expiresAt < new Date()) {
      throw new AppError('Lien de vérification invalide ou expiré', 400, 'INVALID_TOKEN');
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: verification.userId }, data: { emailVerified: true } }),
      prisma.emailVerification.update({ where: { id: verification.id }, data: { used: true } }),
    ]);

    res.json({ success: true, message: 'Email vérifié avec succès' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register, login, refreshToken, logout, forgotPassword, resetPassword, me, googleAuth,
  sendVerificationEmail, verifyEmail, markAppInstalled,
};
