// Validation des variables d'environnement au démarrage
const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  DATABASE_URL: z.string(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  FOOTBALL_API_KEY: z.string().optional(),
  FOOTBALL_API_HOST: z.string().default('api-football-v1.p.rapidapi.com'),
  FOOTBALL_API_BASE_URL: z.string().default('https://api-football-v1.p.rapidapi.com/v3'),
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
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_SECURE: z.string().default('false').transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('Statistique Foot <noreply@statistiquefoot.sn>'),
  BCRYPT_ROUNDS: z.string().default('12').transform(Number),
  APP_NAME: z.string().default('Statistique Foot'),
  ANTHROPIC_API_KEY: z.string().optional(),
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
