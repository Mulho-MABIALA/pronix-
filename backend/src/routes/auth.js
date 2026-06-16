const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const {
  register, login, refreshToken, logout,
  forgotPassword, resetPassword, me,
} = require('../controllers/authController');

const router = Router();

// Rate limit strict sur les routes d'authentification
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, code: 'RATE_LIMITED', message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

router.post('/register', authLimit, register);
router.post('/login', authLimit, login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/forgot-password', authLimit, forgotPassword);
router.post('/reset-password', authLimit, resetPassword);
router.get('/me', authenticate, me);

module.exports = router;
