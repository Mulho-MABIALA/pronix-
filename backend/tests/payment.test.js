/**
 * Tests du webhook GeniusPay — logique d'activation d'abonnement
 * ─────────────────────────────────────────────────────────────────────────────
 * Complète geniuspay.test.js (qui couvre uniquement la signature HMAC) en
 * testant le comportement métier de handleGeniuspayWebhook : un bug ici
 * signifie un client qui a payé mais dont l'abonnement n'est jamais activé.
 */

const express = require('express');
const request = require('supertest');
const crypto  = require('crypto');

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../src/config/database', () => ({
  payment: { findFirst: jest.fn(), update: jest.fn() },
  subscription: { upsert: jest.fn() },
  tipsterSubscription: { upsert: jest.fn() },
  user: { findUnique: jest.fn().mockResolvedValue({ username: 'testuser', email: 'test@example.com' }) },
  $transaction: jest.fn((ops) => Promise.all(ops)),
}));

jest.mock('../src/controllers/pushController', () => ({
  notifyUser: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/controllers/referralController', () => ({
  grantReferralReward: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/controllers/partnerController', () => ({
  grantPartnerCommission: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/services/adminNotificationService', () => ({
  notifyAdmin: jest.fn().mockResolvedValue(true),
}));

const prisma = require('../src/config/database');
const { notifyUser } = require('../src/controllers/pushController');
const { grantReferralReward } = require('../src/controllers/referralController');
const { grantPartnerCommission } = require('../src/controllers/partnerController');
const { handleGeniuspayWebhook } = require('../src/controllers/paymentController');

const SECRET = process.env.GENIUSPAY_WEBHOOK_SECRET;

function buildSignature(rawBody, timestamp, secret = SECRET) {
  const payload = `${timestamp}.${rawBody}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function buildApp() {
  const app = express();
  app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString(); } }));
  app.post('/webhook', handleGeniuspayWebhook);
  return app;
}

function sendWebhook(app, { event = 'payment.success', body, timestamp = String(Math.floor(Date.now() / 1000)), signature }) {
  const raw = JSON.stringify(body);
  const sig = signature !== undefined ? signature : buildSignature(raw, timestamp);
  return request(app)
    .post('/webhook')
    .set('X-Webhook-Event', event)
    .set('X-Webhook-Timestamp', timestamp)
    .set('X-Webhook-Signature', sig)
    .set('Content-Type', 'application/json')
    .send(raw);
}

// Laisse le traitement asynchrone (post-réponse) se dérouler avant d'asserter
const flush = () => new Promise((r) => setTimeout(r, 20));

beforeEach(() => jest.clearAllMocks());

describe('POST /geniuspay/webhook', () => {
  const app = buildApp();

  it('rejette avec 400 si des headers sont manquants', async () => {
    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ event: 'payment.success' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('rejette avec 401 si la signature est invalide', async () => {
    const res = await sendWebhook(app, { body: { data: {} }, signature: 'bad-signature' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Signature invalide');
  });

  it('accepte un event webhook.test sans toucher aux paiements', async () => {
    const res = await sendWebhook(app, { event: 'webhook.test', body: { data: {} } });
    await flush();
    expect(res.status).toBe(200);
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it('ignore un event autre que payment.success', async () => {
    const res = await sendWebhook(app, { event: 'payment.failed', body: { data: {} } });
    await flush();
    expect(res.status).toBe(200);
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it('ignore payment.success dont le statut n\'est pas "completed"', async () => {
    const res = await sendWebhook(app, {
      body: { data: { status: 'pending', reference: 'MTX-1' } },
    });
    await flush();
    expect(res.status).toBe(200);
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it('ne fait rien si aucun paiement PENDING correspondant n\'est trouvé', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);
    const res = await sendWebhook(app, {
      body: { data: { status: 'completed', reference: 'MTX-UNKNOWN', metadata: {} } },
    });
    await flush();
    expect(res.status).toBe(200);
    expect(prisma.payment.findFirst).toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('active l\'abonnement plateforme sur un paiement complété (cas nominal)', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      userId: 'user-1',
      amount: 5000,
      metadata: { planId: 'plan-premium', billingCycle: 'MONTHLY' },
    });

    const res = await sendWebhook(app, {
      body: { data: { status: 'completed', reference: 'MTX-1', metadata: { paymentId: 'pay-1' } } },
    });
    await flush();

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.subscription.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1' },
      update: expect.objectContaining({ planId: 'plan-premium', status: 'ACTIVE' }),
    }));
    expect(prisma.payment.update).toHaveBeenCalledWith({ where: { id: 'pay-1' }, data: { status: 'COMPLETED' } });
    expect(notifyUser).toHaveBeenCalledWith('user-1', expect.objectContaining({ tag: 'subscription-confirmed' }));
    expect(grantReferralReward).toHaveBeenCalledWith('user-1');
    expect(grantPartnerCommission).toHaveBeenCalledWith('user-1', 'pay-1');
  });

  it('active un abonnement tipster quand metadata.type === "tipster"', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-2',
      userId: 'user-2',
      amount: 2000,
      metadata: { type: 'tipster', tipsterId: 'tipster-1', planId: 'tplan-1' },
    });

    const res = await sendWebhook(app, {
      body: { data: { status: 'completed', reference: 'MTX-2', metadata: { paymentId: 'pay-2' } } },
    });
    await flush();

    expect(res.status).toBe(200);
    expect(prisma.tipsterSubscription.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { subscriberId_planId: { subscriberId: 'user-2', planId: 'tplan-1' } },
    }));
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(notifyUser).toHaveBeenCalledWith('tipster-1', expect.objectContaining({ tag: 'tipster-new-subscriber' }));
  });

  it('retrouve le paiement via transactionId (reference) si metadata.paymentId est absent', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-3', userId: 'user-3', amount: 1000, metadata: { planId: 'plan-x', billingCycle: 'YEARLY' },
    });

    await sendWebhook(app, {
      body: { data: { status: 'completed', reference: 'MTX-3', metadata: {} } },
    });
    await flush();

    expect(prisma.payment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [{ transactionId: 'MTX-3' }, { id: undefined }],
        status: 'PENDING',
        provider: 'geniuspay',
      }),
    }));
  });
});
