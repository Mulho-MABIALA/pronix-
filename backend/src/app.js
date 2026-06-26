const env = require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/matches');
const tipRoutes = require('./routes/tips');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profiles');
const newsRoutes = require('./routes/news');
const pushRoutes = require('./routes/push');
const agentRoutes = require('./routes/agents');

// Tâches cron
const { startAllCronJobs } = require('./cron');

const app = express();

// ─── Sécurité & middleware globaux ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Rate limiting global (100 req/15min par IP)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMITED', message: 'Trop de requêtes. Réessayez dans quelques minutes.' },
}));

// Parser JSON — raw pour les webhooks paiement (signature HMAC)
app.use('/api/payments/wave/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payments/cinetpay/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes API ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/agents', agentRoutes);

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
