// Validation des variables d'environnement au démarrage
const path = require('path');
const { z } = require('zod');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  DATABASE_URL: z.string(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  BACKEND_URL: z.string().default('https://fpronix.com'), // URL publique de l'API (callback_url PayDunya, etc.)
  FOOTBALL_API_KEY: z.string().optional(),
  FOOTBALL_API_HOST: z.string().default('v3.football.api-sports.io'),
  FOOTBALL_API_BASE_URL: z.string().default('https://v3.football.api-sports.io'),
  WAVE_API_KEY: z.string().optional(),
  WAVE_BASE_URL: z.string().default('https://api.wave.com/v1'),
  WAVE_WEBHOOK_SECRET: z.string().optional(),
  CINETPAY_API_KEY: z.string().optional(),
  CINETPAY_SITE_ID: z.string().optional(),
  CINETPAY_BASE_URL: z.string().default('https://api-checkout.cinetpay.com/v2'),
  CINETPAY_NOTIFY_URL: z.string().optional(),
  CINETPAY_RETURN_URL: z.string().optional(),
  FEDAPAY_SECRET_KEY: z.string().optional(), // sk_live_xxx (prod) ou sk_sandbox_xxx (test)
  FEDAPAY_WEBHOOK_SECRET: z.string().optional(),
  GENIUSPAY_API_KEY: z.string().optional(),        // pk_sandbox_xxx ou pk_live_xxx
  GENIUSPAY_API_SECRET: z.string().optional(),     // sk_sandbox_xxx ou sk_live_xxx
  GENIUSPAY_WEBHOOK_SECRET: z.string().optional(), // whsec_sandbox_xxx ou whsec_live_xxx
  GENIUSPAY_BASE_URL: z.string().default('https://geniuspay.ci/api/v1/merchant'),
  // PayDunya — agrégateur remplaçant GeniusPay (Wave, Orange Money, MTN, carte…)
  PAYDUNYA_MASTER_KEY: z.string().optional(),
  PAYDUNYA_PRIVATE_KEY: z.string().optional(),  // test_private_xxx ou live_private_xxx
  PAYDUNYA_PUBLIC_KEY: z.string().optional(),
  PAYDUNYA_TOKEN: z.string().optional(),
  PAYDUNYA_BASE_URL: z.string().default('https://app.paydunya.com/api/v1'),
  PAYDUNYA_STORE_NAME: z.string().default('fpronix'),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_SECURE: z.string().default('false').transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('Statistique Foot <noreply@statistiquefoot.sn>'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  BCRYPT_ROUNDS: z.string().default('12').transform(Number),
  APP_NAME: z.string().default('Statistique Foot'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ODDS_API_KEY: z.string().optional(),       // The Odds API — https://the-odds-api.com (500 req/mois gratuit)
  RESEND_API_KEY: z.string().optional(),     // Resend — https://resend.com (3000 mails/mois gratuit)
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables d\'environnement invalides:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
