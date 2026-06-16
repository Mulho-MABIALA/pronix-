const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../config/database');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');

// ─── Schémas de validation ──────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe min. 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir une majuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir un chiffre'),
  username: z.string()
    .min(3, 'Pseudo min. 3 caractères')
    .max(30, 'Pseudo max. 30 caractères')
    .regex(/^[a-zA-Z0-9_]+$/, 'Pseudo : lettres, chiffres et underscore uniquement'),
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

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function getRefreshExpiryDate() {
  const days = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Inscription ─────────────────────────────────────────────────────────────
async function register(req, res, next) {
  try {
    const { email, password, username } = registerSchema.parse(req.body);

    const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    const freePlan = await prisma.plan.findUnique({ where: { code: 'FREE' } });

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
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

    const accessToken = generateAccessToken(user.id);
    const refreshTokenValue = generateRefreshToken();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: getRefreshExpiryDate(),
      },
    });

    const { password: _, ...userSafe } = user;
    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: { user: userSafe, accessToken, refreshToken: refreshTokenValue },
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

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError('Email ou mot de passe incorrect', 401, 'INVALID_CREDENTIALS');
    }

    const accessToken = generateAccessToken(user.id);
    const refreshTokenValue = generateRefreshToken();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: getRefreshExpiryDate(),
      },
    });

    const { password: _, ...userSafe } = user;
    res.json({
      success: true,
      data: { user: userSafe, accessToken, refreshToken: refreshTokenValue },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Renouvellement du token ─────────────────────────────────────────────────
async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = z.object({ refreshToken: z.string() }).parse(req.body);

    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { subscription: { include: { plan: true } }, profile: true } } },
    });

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new AppError('Refresh token invalide ou expiré', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Rotation du refresh token (sécurité)
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const newRefreshToken = generateRefreshToken();
    await prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        token: newRefreshToken,
        expiresAt: getRefreshExpiryDate(),
      },
    });

    const accessToken = generateAccessToken(stored.userId);
    const { password: _, ...userSafe } = stored.user;

    res.json({
      success: true,
      data: { user: userSafe, accessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Déconnexion ─────────────────────────────────────────────────────────────
async function logout(req, res, next) {
  try {
    const { refreshToken: token } = z.object({ refreshToken: z.string() }).parse(req.body);
    await prisma.refreshToken.deleteMany({ where: { token } });
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

// ─── Profil de l'utilisateur connecté ────────────────────────────────────────
async function me(req, res) {
  const { password: _, ...userSafe } = req.user;
  res.json({ success: true, data: userSafe });
}

module.exports = { register, login, refreshToken, logout, forgotPassword, resetPassword, me };
