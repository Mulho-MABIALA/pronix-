const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/database');
const waveService = require('../services/waveService');
const cinetpayService = require('../services/cinetpayService');
const fedapayService = require('../services/fedapayService');
const { AppError } = require('../middleware/errorHandler');
const env = require('../config/env');

// ─── Helper : active/renouvelle l'abonnement après paiement validé ───────────
async function activateSubscription(userId, planId, billingCycle, paymentId) {
  const durationDays = billingCycle === 'YEARLY' ? 365 : 30;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);

  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { userId },
      update: { planId, billingCycle, status: 'ACTIVE', endDate, updatedAt: new Date() },
      create: { userId, planId, billingCycle, status: 'ACTIVE', endDate },
    }),
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'COMPLETED' },
    }),
  ]);
}

// ─── Initier un paiement Wave ──────────────────────────────────────────────────
async function initiateWavePayment(req, res, next) {
  try {
    const schema = z.object({
      planId: z.string().uuid(),
      billingCycle: z.enum(['MONTHLY', 'YEARLY']),
    });
    const { planId, billingCycle } = schema.parse(req.body);

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || plan.code === 'FREE') throw new AppError('Plan invalide', 400, 'INVALID_PLAN');

    const amount = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
    const clientReference = uuidv4();

    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        amount,
        method: 'WAVE',
        status: 'PENDING',
        provider: 'wave',
        providerRef: clientReference,
        metadata: { planId, billingCycle },
      },
    });

    const session = await waveService.createCheckoutSession({
      amount,
      clientReference,
      successUrl: `${env.FRONTEND_URL}/abonnement/confirmation?ref=${clientReference}`,
      errorUrl: `${env.FRONTEND_URL}/abonnement/erreur?ref=${clientReference}`,
    });

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        waveUrl: session.wave_launch_url,
        clientReference,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Webhook Wave ──────────────────────────────────────────────────────────────
async function handleWaveWebhook(req, res, next) {
  try {
    const signature = req.headers['x-wave-signature'];
    if (!waveService.verifyWebhookSignature(req.body, signature)) {
      return res.status(401).json({ error: 'Signature invalide' });
    }

    const { eventType, clientReference, transactionId, status } = waveService.parseWebhookPayload(req.body);

    if (eventType !== 'checkout.session.completed' || status !== 'succeeded') {
      return res.json({ received: true });
    }

    const payment = await prisma.payment.findFirst({
      where: { providerRef: clientReference, status: 'PENDING' },
    });

    if (!payment) return res.json({ received: true });

    const { planId, billingCycle } = payment.metadata;
    await prisma.payment.update({ where: { id: payment.id }, data: { transactionId } });
    await activateSubscription(payment.userId, planId, billingCycle, payment.id);

    res.json({ received: true });
  } catch (err) {
    console.error('[Webhook Wave] Erreur:', err.message);
    res.status(500).json({ error: 'Erreur interne' });
  }
}

// ─── Initier un paiement CinetPay (carte bancaire) ────────────────────────────
async function initiateCinetpayPayment(req, res, next) {
  try {
    const schema = z.object({
      planId: z.string().uuid(),
      billingCycle: z.enum(['MONTHLY', 'YEARLY']),
    });
    const { planId, billingCycle } = schema.parse(req.body);

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || plan.code === 'FREE') throw new AppError('Plan invalide', 400, 'INVALID_PLAN');

    const amount = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
    const transactionId = `CP-${Date.now()}-${req.user.id.slice(0, 8)}`;

    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        amount,
        method: 'CARD',
        status: 'PENDING',
        provider: 'cinetpay',
        providerRef: transactionId,
        metadata: { planId, billingCycle },
      },
    });

    const result = await cinetpayService.initTransaction({
      amount,
      transactionId,
      description: `Abonnement ${plan.displayName} — ${billingCycle === 'YEARLY' ? 'Annuel' : 'Mensuel'}`,
      customerName: req.user.profile?.displayName || req.user.username,
      customerEmail: req.user.email,
    });

    if (result.code !== '201') {
      throw new AppError('Erreur lors de l\'initialisation du paiement', 500, 'PAYMENT_ERROR');
    }

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentUrl: result.data.payment_url,
        transactionId,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Webhook CinetPay ──────────────────────────────────────────────────────────
async function handleCinetpayWebhook(req, res, next) {
  try {
    const body = Buffer.isBuffer(req.body) ? req.body.toString() : req.body;
    const { transactionId, status } = cinetpayService.parseWebhookPayload(body);

    if (status !== '00') return res.json({ received: true });

    // Vérification du statut réel auprès de CinetPay
    const check = await cinetpayService.checkTransactionStatus(transactionId);
    if (check?.data?.status !== 'ACCEPTED') return res.json({ received: true });

    const payment = await prisma.payment.findFirst({
      where: { providerRef: transactionId, status: 'PENDING' },
    });

    if (!payment) return res.json({ received: true });

    const { planId, billingCycle } = payment.metadata;
    await prisma.payment.update({ where: { id: payment.id }, data: { transactionId } });
    await activateSubscription(payment.userId, planId, billingCycle, payment.id);

    res.json({ received: true });
  } catch (err) {
    console.error('[Webhook CinetPay] Erreur:', err.message);
    res.status(500).json({ error: 'Erreur interne' });
  }
}

// ─── Vérification du statut d'un paiement (polling côté client) ───────────────
async function verifyPayment(req, res, next) {
  try {
    const { ref, mock } = req.query;
    if (!ref) return res.status(400).json({ success: false, message: 'ref manquant' });

    // Mode simulation (dev) : active directement l'abonnement
    if (mock === '1' && process.env.NODE_ENV !== 'production') {
      const payment = await prisma.payment.findFirst({
        where: { providerRef: ref, userId: req.user.id },
        include: { metadata: true },
      });

      if (payment && payment.status === 'PENDING') {
        const { planId, billingCycle } = payment.metadata;
        await activateSubscription(req.user.id, planId, billingCycle, payment.id);
      }

      const sub = await prisma.subscription.findUnique({
        where: { userId: req.user.id },
        include: { plan: true },
      });
      return res.json({ success: true, data: { confirmed: true, plan: sub?.plan?.code || null } });
    }

    // Mode réel : vérifie si le paiement est complété
    const payment = await prisma.payment.findFirst({
      where: { providerRef: ref, userId: req.user.id },
    });

    if (!payment) {
      return res.json({ success: true, data: { confirmed: false } });
    }

    if (payment.status === 'COMPLETED') {
      const sub = await prisma.subscription.findUnique({
        where: { userId: req.user.id },
        include: { plan: true },
      });
      return res.json({ success: true, data: { confirmed: true, plan: sub?.plan?.code || null } });
    }

    return res.json({ success: true, data: { confirmed: false, status: payment.status } });
  } catch (err) {
    next(err);
  }
}

// ─── Initier un paiement FedaPay ──────────────────────────────────────────────
async function initiateFedapayPayment(req, res, next) {
  try {
    const schema = z.object({
      planId:       z.string().uuid(),
      billingCycle: z.enum(['MONTHLY', 'YEARLY']),
    });
    const { planId, billingCycle } = schema.parse(req.body);

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || plan.code === 'FREE') throw new AppError('Plan invalide', 400, 'INVALID_PLAN');

    const amount    = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
    const reference = `FP-${Date.now()}-${req.user.id.slice(0, 8)}`;

    const payment = await prisma.payment.create({
      data: {
        userId:     req.user.id,
        amount,
        method:     'CARD', // FedaPay gère Wave + Mobile Money + Carte via un seul flux
        status:     'PENDING',
        provider:   'fedapay',
        providerRef: reference,
        metadata:   { planId, billingCycle },
      },
    });

    // Récupère prénom/nom depuis le profil si disponible
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
    const [firstname, ...rest] = (profile?.displayName || req.user.username).split(' ');

    const { transactionId, paymentUrl } = await fedapayService.createTransaction({
      amount,
      description:       `Abonnement ${plan.displayName} — ${billingCycle === 'YEARLY' ? 'Annuel' : 'Mensuel'}`,
      customerEmail:     req.user.email,
      customerFirstname: firstname,
      customerLastname:  rest.join(' ') || 'StatFoot',
      reference,
    });

    // Stocker l'ID FedaPay pour le rapprochement webhook
    await prisma.payment.update({
      where: { id: payment.id },
      data:  { transactionId },
    });

    res.json({
      success: true,
      data: { paymentId: payment.id, paymentUrl, reference },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Webhook FedaPay ───────────────────────────────────────────────────────────
async function handleFedapayWebhook(req, res) {
  try {
    const { event, transactionId, status } = fedapayService.parseWebhook(req.body);

    if (event !== 'transaction.approved' || status !== 'approved') {
      return res.json({ received: true });
    }

    // Double vérification auprès de l'API FedaPay
    const fp = await fedapayService.getTransaction(transactionId);
    if (!fp || fp.status !== 'approved') return res.json({ received: true });

    const payment = await prisma.payment.findFirst({
      where: { transactionId: String(transactionId), status: 'PENDING', provider: 'fedapay' },
    });
    if (!payment) return res.json({ received: true });

    const { planId, billingCycle } = payment.metadata;
    await activateSubscription(payment.userId, planId, billingCycle, payment.id);

    res.json({ received: true });
  } catch (err) {
    console.error('[Webhook FedaPay] Erreur:', err.message);
    res.status(500).json({ error: 'Erreur interne' });
  }
}

module.exports = {
  initiateWavePayment, handleWaveWebhook,
  initiateCinetpayPayment, handleCinetpayWebhook,
  initiateFedapayPayment, handleFedapayWebhook,
  verifyPayment,
};
