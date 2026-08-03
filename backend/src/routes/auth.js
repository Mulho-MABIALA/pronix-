const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const {
  register, login, refreshToken, logout,
  forgotPassword, resetPassword, me, googleAuth,
  sendVerificationEmail, verifyEmail, markAppInstalled,
} = require('../controllers/authController');
const {
  registrationOptions, registrationVerify,
  loginOptions, loginVerify,
  listDevices, deleteDevice,
} = require('../controllers/webauthnController');

const router = Router();

// Rate limit strict sur les routes d'authentification
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, code: 'RATE_LIMITED', message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

router.post('/register', authLimit, register);
router.post('/login', authLimit, login);
router.post('/google', authLimit, googleAuth);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/forgot-password', authLimit, forgotPassword);
router.post('/reset-password', authLimit, resetPassword);
router.get('/me', authenticate, me);
router.post('/send-verification', authenticate, sendVerificationEmail);
router.get('/verify-email/:token', verifyEmail);
router.post('/app-installed', authenticate, markAppInstalled);

// ─── Passkeys / WebAuthn ────────────────────────────────────────────────────
// Enregistrement : utilisateur déjà connecté, ajoute un appareil.
router.post('/webauthn/registration-options', authenticate, registrationOptions);
router.post('/webauthn/registration-verify', authenticate, registrationVerify);
// Connexion : usernameless — pas d'email, le navigateur propose les passkeys du domaine.
router.post('/webauthn/login-options', authLimit, loginOptions);
router.post('/webauthn/login-verify', authLimit, loginVerify);
// Gestion des appareils enregistrés (page Profil).
router.get('/webauthn/devices', authenticate, listDevices);
router.delete('/webauthn/devices/:id', authenticate, deleteDevice);

module.exports = router;
