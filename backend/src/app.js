const env = require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const { errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes       = require('./routes/auth');
const matchRoutes = require('./routes/matches');
const tipRoutes = require('./routes/tips');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profiles');
const newsRoutes = require('./routes/news');
const pushRoutes = require('./routes/push');
const agentRoutes = require('./routes/agents');
const searchRoutes = require('./routes/search');
const favoritesRoutes = require('./routes/favorites');
const referralsRoutes = require('./routes/referrals');
const betsRoutes = require('./routes/bets');
const remindersRoutes = require('./routes/reminders');
const sitemapRoutes = require('./routes/sitemap');
const blogRoutes         = require('./routes/blog');
const teamsRoutes        = require('./routes/teams');
const tipsterPlansRoutes = require('./routes/tipsterPlans');
const followsRoutes      = require('./routes/follows');
const commentsRoutes     = require('./routes/comments');
const analyticsRoutes    = require('./routes/analytics');
const oddsAlertsRoutes   = require('./routes/oddsAlerts');
const coachRoutes        = require('./routes/coach');
const supportRoutes      = require('./routes/support');
const transparencyRoutes = require('./routes/transparency');
const imgProxyRoutes     = require('./routes/imgProxy');
const ticketsRoutes      = require('./routes/tickets');
const partnersRoutes     = require('./routes/partners');
const currencyRoutes     = require('./routes/currency');
const newsletterRoutes   = require('./routes/newsletter');

// Tâches cron
const { startAllCronJobs } = require('./cron');

const app = express();

// ─── Sécurité & middleware globaux ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Rate limiting global (600 req/15min par IP, ~40/min).
// Une SPA React Query (polling matchs/live, cloche notifs, quota ticket, etc.)
// consomme facilement plusieurs dizaines de requêtes par minute rien qu'en
// restant ouverte — l'ancienne limite de 100/15min (~6,7/min) se déclenchait
// donc en usage normal, pas seulement en cas d'abus (cf. générateur de tickets).
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMITED', message: 'Trop de requêtes. Réessayez dans quelques minutes.' },
}));

// Rate limiting strict sur l'authentification (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMITED', message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
});

// Parser JSON — raw pour les webhooks paiement (signature HMAC)
app.use('/api/payments/wave/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payments/cinetpay/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payments/geniuspay/webhook', express.json({
  limit: '10kb',
  verify: (req, _res, buf) => { req.rawBody = buf.toString(); },
}));
// Route profil : accepte jusqu'à 2mb pour les avatars base64
app.use('/api/profiles', express.json({ limit: '2mb' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── Routes API ────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/bets', betsRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/tipster-plans', tipsterPlansRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/odds-alerts', oddsAlertsRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/transparency', transparencyRoutes);
app.use('/api/img-proxy', imgProxyRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/sitemap.xml', sitemapRoutes);

// Santé de l'API
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API opérationnelle', timestamp: new Date().toISOString() });
});

// Route inconnue
app.use((req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Route introuvable' });
});

// Gestionnaire d'erreurs global
app.use(errorHandler);

// ─── Démarrage ─────────────────────────────────────────────────────────────────
const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`🚀 API démarrée sur le port ${PORT} (${env.NODE_ENV})`);
  if (env.NODE_ENV !== 'test') {
    startAllCronJobs();
  }
});

module.exports = app;
