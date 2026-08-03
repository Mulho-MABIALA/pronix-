const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../config/database');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');
const { setAuthCookies } = require('../config/cookies');
const webauthnService = require('../services/webauthnService');

// Vérifie le jeton d'étape émis par authController.login() pour un compte
// ADMIN protégé par passkey — voir generateStepUpToken() côté authController.
// Volontairement dupliqué/isolé (pas de vérification croisée du "purpose")
// pour qu'un simple access token ne puisse jamais être rejoué ici par erreur.
function verifyStepUpToken(stepUpToken) {
  let payload;
  try {
    payload = jwt.verify(stepUpToken, env.JWT_ACCESS_SECRET);
  } catch {
    throw new AppError('Session de connexion expirée, recommencez', 401, 'STEP_UP_EXPIRED');
  }
  if (payload.purpose !== 'admin_step_up' || !payload.sub) {
    throw new AppError('Jeton invalide', 401, 'STEP_UP_INVALID');
  }
  return payload.sub; // userId
}

// Émission de session identique à authController.login() : mêmes helpers,
// dupliqués ici volontairement (non exportés par authController) pour ne pas
// toucher au flux email/mot de passe existant.
function generateAccessToken(userId) {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
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

async function issueSession(res, user) {
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
}

// ─── Enregistrement (utilisateur connecté) ──────────────────────────────────
async function registrationOptions(req, res, next) {
  try {
    const options = await webauthnService.getRegistrationOptions(req.user);
    res.json({ success: true, data: options });
  } catch (err) {
    next(err);
  }
}

async function registrationVerify(req, res, next) {
  try {
    const schema = z.object({
      response: z.record(z.any()),
      deviceName: z.string().max(60).optional(),
    });
    const { response, deviceName } = schema.parse(req.body);

    await webauthnService.verifyRegistration(req.user, response, deviceName);
    res.json({ success: true, message: 'Passkey enregistrée avec succès' });
  } catch (err) {
    next(err);
  }
}

// ─── Connexion (utilisateur anonyme, usernameless) ─────────────────────────
async function loginOptions(req, res, next) {
  try {
    const { options, challengeId } = await webauthnService.getAuthenticationOptions();
    res.json({ success: true, data: { options, challengeId } });
  } catch (err) {
    next(err);
  }
}

async function loginVerify(req, res, next) {
  try {
    const schema = z.object({
      challengeId: z.string(),
      response: z.record(z.any()),
    });
    const { challengeId, response } = schema.parse(req.body);

    const user = await webauthnService.verifyAuthentication(challengeId, response);
    await issueSession(res, user);

    const { password: _, ...userSafe } = user;
    res.json({ success: true, data: { user: userSafe } });
  } catch (err) {
    next(err);
  }
}

// ─── Step-up passkey pour connexion ADMIN ──────────────────────────────────
// Déclenché quand authController.login() renvoie code:'PASSKEY_REQUIRED' pour
// un compte ADMIN ayant déjà une passkey enregistrée. Le mot de passe seul ne
// suffit pas : il faut confirmer via cette passkey avant qu'une session ne
// soit ouverte. Le prompt est restreint aux passkeys du compte identifié par
// le stepUpToken (pas de login usernameless ici).
async function adminStepUpOptions(req, res, next) {
  try {
    const { stepUpToken } = z.object({ stepUpToken: z.string() }).parse(req.body);
    const userId = verifyStepUpToken(stepUpToken);
    const { options, challengeId } = await webauthnService.getAuthenticationOptions(userId);
    res.json({ success: true, data: { options, challengeId } });
  } catch (err) {
    next(err);
  }
}

async function adminStepUpVerify(req, res, next) {
  try {
    const schema = z.object({
      stepUpToken: z.string(),
      challengeId: z.string(),
      response: z.record(z.any()),
    });
    const { stepUpToken, challengeId, response } = schema.parse(req.body);
    const expectedUserId = verifyStepUpToken(stepUpToken);

    const user = await webauthnService.verifyAuthentication(challengeId, response);
    if (user.id !== expectedUserId) {
      // La passkey utilisée n'est pas celle du compte qui vient de saisir le
      // mot de passe — refuser plutôt que d'ouvrir la mauvaise session.
      throw new AppError('Cette passkey ne correspond pas au compte', 401, 'STEP_UP_MISMATCH');
    }

    await issueSession(res, user);

    const { password: _, ...userSafe } = user;
    res.json({ success: true, data: { user: userSafe } });
  } catch (err) {
    next(err);
  }
}

// ─── Gestion des appareils (utilisateur connecté) ──────────────────────────
async function listDevices(req, res, next) {
  try {
    const devices = await webauthnService.listCredentials(req.user.id);
    res.json({ success: true, data: devices });
  } catch (err) {
    next(err);
  }
}

async function deleteDevice(req, res, next) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await webauthnService.deleteCredential(req.user.id, id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registrationOptions,
  registrationVerify,
  loginOptions,
  loginVerify,
  adminStepUpOptions,
  adminStepUpVerify,
  listDevices,
  deleteDevice,
};
