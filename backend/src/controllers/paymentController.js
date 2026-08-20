const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/database');
const waveService = require('../services/waveService');
const paytechService = require('../services/paytechService');
const fedapayService = require('../services/fedapayService');
const flutterwaveService = require('../services/flutterwaveService');
const currencyService = require('../services/currencyService');
const { AppError } = require('../middleware/errorHandler');
const env = require('../config/env');
const { notifyUser } = require('./pushController');
const { grantReferralReward } = require('./referralController');
const { grantPartnerCommission } = require('./partnerController');
const { notifyAdmin } = require('../services/adminNotificationService');

// ─── Helper : prix du plan selon le cycle de facturation (hebdo/mensuel/annuel) ─
// LIFETIME est un paiement unique, indépendant du cycle sélectionné dans l'UI —
// sans ce garde-fou, un utilisateur pourrait sélectionner "Hebdomadaire" puis
// acheter le plan Lifetime au prix hebdo (voire 0 FCFA tant que priceWeekly
// n'est pas configuré pour ce plan).
function getPlanPrice(plan, billingCycle) {
  if (plan.code === 'LIFETIME') return plan.priceMonthly;
  if (billingCycle === 'WEEKLY') return plan.priceWeekly;
  if (billingCycle === 'YEARLY') return plan.priceYearly;
  return plan.priceMonthly;
}

// ─── Helper : libellé du cycle de facturation (pour descriptions paiement) ────
function billingLabel(billingCycle, lowercase = false) {
  const label = billingCycle === 'WEEKLY' ? 'Hebdomadaire' : billingCycle === 'YEARLY' ? 'Annuel' : 'Mensuel';
  return lowercase ? label.toLowerCase() : label;
}

// ─── Helper : active/renouvelle l'abonnement après paiement validé ───────────
async function activateSubscription(userId, planId, billingCycle, paymentId) {
  const durationDays = billingCycle === 'WEEKLY' ? 7 : billingCycle === 'YEARLY' ? 365 : 30;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);

  const [, payment] = await prisma.$transaction([
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

  // Cloche admin — best-effort, ne bloque jamais l'activation de l'abonnement
  prisma.user.findUnique({ where: { id: userId }, select: { username: true, email: true } })
    .then((u) => notifyAdmin({
      type: 'NEW_PAYMENT',
      title: 'Nouveau paiement',
      message: `${u?.username || 'Un utilisateur'} a payé ${payment.amount.toLocaleString('fr-FR')} FCFA (${billingLabel(billingCycle)}).`,
      link: '/admin/paiements',
    }))
    .catch(() => {});

  // Push de confirmation (fire & forget)
  notifyUser(userId, {
    title: '🎉 Bienvenue Premium !',
    body:  `Votre abonnement ${billingLabel(billingCycle, true)} est maintenant actif. Profitez de tous les avantages !`,
    url:   '/profil',
    tag:   'subscription-confirmed',
  }).catch(() => {});

  // Récompense de parrainage (si ce paiement est le 1er abonnement payant d'un filleul)
  grantReferralReward(userId).catch(() => {});

  // Commission partenaire/influenceur (si l'utilisateur est venu via un code partenaire)
  grantPartnerCommission(userId, paymentId).catch(() => {});
}

// ─── Helper : active/renouvelle un abonnement à un plan TIPSTER après paiement ─
async function activateTipsterSubscription(subscriberId, tipsterId, planId, paymentId) {
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  const [, payment] = await prisma.$transaction([
    prisma.tipsterSubscription.upsert({
      where:  { subscriberId_planId: { subscriberId, planId } },
      update: { status: 'ACTIVE', startDate: new Date(), endDate },
      create: { subscriberId, planId, status: 'ACTIVE', endDate },
    }),
    prisma.payment.update({
      where: { id: paymentId },
      data:  { status: 'COMPLETED' },
    }),
  ]);

  // Cloche admin — best-effort
  prisma.user.findUnique({ where: { id: subscriberId }, select: { username: true } })
    .then((u) => notifyAdmin({
      type: 'NEW_PAYMENT',
      title: 'Nouveau paiement (abonnement tipster)',
      message: `${u?.username || 'Un utilisateur'} a payé ${payment.amount.toLocaleString('fr-FR')} FCFA pour un abonnement tipster.`,
      link: '/admin/paiements',
    }))
    .catch(() => {});

  notifyUser(subscriberId, {
    title: '🎉 Abonnement tipster activé',
    body:  'Vous suivez maintenant les pronostics premium de ce tipster.',
    url:   '/tipsters',
    tag:   'tipster-subscription-confirmed',
  }).catch(() => {});

  notifyUser(tipsterId, {
    title: '💰 Nouvel abonné premium !',
    body:  'Quelqu\'un vient de s\'abonner à votre plan payant.',
    url:   '/profil',
    tag:   'tipster-new-subscriber',
  }).catch(() => {});
}

// ─── Initier un paiement Wave ──────────────────────────────────────────────────
async function initiateWavePayment(req, res, next) {
  try {
    const schema = z.object({
      planId: z.string().uuid(),
      billingCycle: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
    });
    const { planId, billingCycle } = schema.parse(req.body);

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || plan.code === 'FREE') throw new AppError('Plan invalide', 400, 'INVALID_PLAN');

    const amount = getPlanPrice(plan, billingCycle);
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

    // Claim atomique : updateMany avec la garde status:'PENDING' dans le WHERE
    // fait office de verrou — si deux webhooks identiques/dupliqués arrivent
    // en parallèle (retry du fournisseur, double delivery...), un seul des deux
    // gagne la transition PENDING→COMPLETED (count === 1) ; l'autre voit
    // count === 0 et n'active jamais l'abonnement une seconde fois. L'ancien
    // code faisait un findFirst PENDING puis un update séparé — une fenêtre de
    // course permettait un double-crédit d'abonnement.
    const claimed = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data:  { status: 'COMPLETED', transactionId },
    });
    if (claimed.count === 0) return res.json({ received: true });

    const { planId, billingCycle } = payment.metadata;
    try {
      await activateSubscription(payment.userId, planId, billingCycle, payment.id);
    } catch (activationErr) {
      // Le paiement reste marqué COMPLETED (empêche un retraitement en double
      // par un futur retry du webhook) mais l'activation a échoué — nécessite
      // une intervention manuelle admin (activation manuelle depuis AdminUsers).
      console.error(`[Webhook Wave] Échec activation après claim atomique — paymentId=${payment.id}:`, activationErr.message);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Webhook Wave] Erreur:', err.message);
    res.status(500).json({ error: 'Erreur interne' });
  }
}

// ─── Initier un paiement PayTech (carte bancaire / Mobile Money) ─────────────
// Devises acceptées par PayTech (cf. doc) : XOF, EUR, USD, CAD, GBP, MAD —
// intersection retenue avec les devises détectées par useCurrency côté
// frontend (currencyService) : EUR, USD, GBP, CAD. Une devise détectée hors
// de cette liste (BRL, MXN, ZAR) retombe sur USD plutôt que de bloquer le
// paiement (cf. Subscription.jsx).
const PAYTECH_CURRENCIES = ['EUR', 'USD', 'GBP', 'CAD'];

async function initiatePaytechPayment(req, res, next) {
  try {
    const schema = z.object({
      planId:       z.string().uuid(),
      billingCycle: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
      // Devise étrangère optionnelle — absente/'XOF' = paiement FCFA classique
      // (Mobile Money + carte), sinon carte internationale uniquement.
      currency: z.enum(PAYTECH_CURRENCIES).optional(),
    });
    const { planId, billingCycle, currency } = schema.parse(req.body);

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || plan.code === 'FREE') throw new AppError('Plan invalide', 400, 'INVALID_PLAN');

    const amountFcfa = getPlanPrice(plan, billingCycle);
    const chargedAmount   = currency ? currencyService.convertFromXof(amountFcfa, currency) : amountFcfa;
    const chargedCurrency = currency || 'XOF';
    if (currency && !chargedAmount) throw new AppError('Devise non supportée', 400, 'UNSUPPORTED_CURRENCY');

    const refCommand = `PT-${Date.now()}-${req.user.id.slice(0, 8)}`;

    const payment = await prisma.payment.create({
      data: {
        userId:      req.user.id,
        amount:      amountFcfa, // référence interne en FCFA (cohérence rapports admin)
        currency:    chargedCurrency,
        method:      currency ? 'CARD' : 'MOBILE_MONEY',
        status:      'PENDING',
        provider:    'paytech',
        providerRef: refCommand,
        metadata:    { planId, billingCycle, chargedAmount, chargedCurrency },
      },
    });

    const result = await paytechService.requestPayment({
      amount: chargedAmount,
      currency: chargedCurrency,
      refCommand,
      itemName: `Abonnement ${plan.displayName}`,
      commandName: `Abonnement ${plan.displayName} — ${billingLabel(billingCycle)}`,
      customField: { paymentId: payment.id, userId: req.user.id },
      // Mobile Money n'existe qu'en FCFA — carte uniquement pour une devise étrangère.
      // Sans devise (FCFA) : target_payment vide = toutes les méthodes proposées
      // par PayTech (Orange Money, Wave, Free Money, Wizall, Carte Bancaire...).
      targetPayment: currency ? 'Carte Bancaire' : '',
    });

    if (result.success !== 1) {
      throw new AppError(result.message || 'Erreur lors de l\'initialisation du paiement', 500, 'PAYMENT_ERROR');
    }

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        checkoutUrl: result.redirect_url,
        transactionId: refCommand,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Initier un paiement PayTech pour s'abonner au plan payant d'un TIPSTER ──
// Remplace initiateTipsterGeniuspayPayment (retiré) — même logique que
// l'abonnement plateforme ci-dessus, avec metadata.type='tipster' pour que
// handlePaytechWebhook route vers activateTipsterSubscription.
async function initiateTipsterPaytechPayment(req, res, next) {
  try {
    const schema = z.object({
      tipsterId: z.string().uuid(),
      currency:  z.enum(PAYTECH_CURRENCIES).optional(),
    });
    const { tipsterId, currency } = schema.parse(req.body);

    if (tipsterId === req.user.id) {
      throw new AppError('Vous ne pouvez pas vous abonner à vous-même', 400, 'SELF_SUBSCRIBE');
    }

    const plan = await prisma.tipsterPlan.findUnique({ where: { tipsterId } });
    if (!plan || !plan.isActive) throw new AppError('Plan introuvable', 404, 'NOT_FOUND');

    const existing = await prisma.tipsterSubscription.findUnique({
      where: { subscriberId_planId: { subscriberId: req.user.id, planId: plan.id } },
    });
    if (existing && existing.status === 'ACTIVE' && existing.endDate && existing.endDate > new Date()) {
      throw new AppError('Déjà abonné à ce tipster', 409, 'ALREADY_SUBSCRIBED');
    }

    const chargedAmount   = currency ? currencyService.convertFromXof(plan.price, currency) : plan.price;
    const chargedCurrency = currency || 'XOF';
    if (currency && !chargedAmount) throw new AppError('Devise non supportée', 400, 'UNSUPPORTED_CURRENCY');

    const refCommand = `PTT-${Date.now()}-${req.user.id.slice(0, 8)}`;

    const payment = await prisma.payment.create({
      data: {
        userId:      req.user.id,
        amount:      plan.price,
        currency:    chargedCurrency,
        method:      currency ? 'CARD' : 'MOBILE_MONEY',
        status:      'PENDING',
        provider:    'paytech',
        providerRef: refCommand,
        metadata:    { type: 'tipster', tipsterId, planId: plan.id, chargedAmount, chargedCurrency },
      },
    });

    const result = await paytechService.requestPayment({
      amount: chargedAmount,
      currency: chargedCurrency,
      refCommand,
      itemName: `Abonnement tipster — ${plan.name}`,
      commandName: `Abonnement tipster — ${plan.name}`,
      customField: { paymentId: payment.id, userId: req.user.id, type: 'tipster', tipsterId },
      targetPayment: currency ? 'Carte Bancaire' : '',
    });

    if (result.success !== 1) {
      throw new AppError(result.message || 'Erreur lors de l\'initialisation du paiement', 500, 'PAYMENT_ERROR');
    }

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        checkoutUrl: result.redirect_url,
        transactionId: refCommand,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Webhook PayTech (IPN) ─────────────────────────────────────────────────────
async function handlePaytechWebhook(req, res, next) {
  try {
    const ipn = paytechService.parseIpnPayload(req.body);

    const validHmac = paytechService.verifyIpnHmac({
      itemPrice: ipn.itemPrice,
      refCommand: ipn.refCommand,
      hmacCompute: ipn.hmacCompute,
    });
    if (!validHmac) {
      console.warn(`[Webhook PayTech] HMAC invalide — ref_command=${ipn.refCommand}`);
      return res.status(401).json({ error: 'Signature invalide' });
    }

    if (ipn.typeEvent !== 'sale_complete') return res.json({ received: true });

    const payment = await prisma.payment.findFirst({
      where: { providerRef: ipn.refCommand, status: 'PENDING', provider: 'paytech' },
    });

    if (!payment) return res.json({ received: true });

    // Garde-fou : montant réellement payé doit couvrir le montant facturé
    // (protection contre une manipulation côté client, cf. même contrôle sur
    // le webhook Flutterwave).
    const expected = payment.metadata?.chargedAmount;
    if (expected && Math.round(ipn.itemPrice) < Math.round(expected)) {
      console.error(`[Webhook PayTech] Montant payé (${ipn.itemPrice}) < attendu (${expected}) — paymentId=${payment.id}`);
      return res.json({ received: true });
    }

    // Claim atomique : voir commentaire détaillé dans handleWaveWebhook.
    // PayTech peut renvoyer le même IPN plusieurs fois (retry sur non-200) —
    // sans ce verrou, deux requêtes concurrentes passaient toutes les deux le
    // findFirst PENDING et activaient l'abonnement deux fois.
    const claimed = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data:  { status: 'COMPLETED', transactionId: ipn.token },
    });
    if (claimed.count === 0) return res.json({ received: true });

    try {
      if (payment.metadata?.type === 'tipster') {
        const { tipsterId, planId } = payment.metadata;
        await activateTipsterSubscription(payment.userId, tipsterId, planId, payment.id);
      } else {
        const { planId, billingCycle } = payment.metadata;
        await activateSubscription(payment.userId, planId, billingCycle, payment.id);
      }
    } catch (activationErr) {
      console.error(`[Webhook PayTech] Échec activation après claim atomique — paymentId=${payment.id}:`, activationErr.message);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Webhook PayTech] Erreur:', err.message);
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
        // metadata est un champ JSON scalaire, pas une relation (pas d'include)
      });

      if (payment && payment.status === 'PENDING') {
        if (payment.metadata?.type === 'tipster') {
          const { tipsterId, planId } = payment.metadata;
          await activateTipsterSubscription(req.user.id, tipsterId, planId, payment.id);
        } else {
          const { planId, billingCycle } = payment.metadata;
          await activateSubscription(req.user.id, planId, billingCycle, payment.id);
        }
      }

      if (payment?.metadata?.type === 'tipster') {
        return res.json({ success: true, data: { confirmed: true, type: 'tipster', tipsterId: payment.metadata.tipsterId, amount: payment.amount } });
      }

      const sub = await prisma.subscription.findUnique({
        where: { userId: req.user.id },
        include: { plan: true },
      });
      return res.json({ success: true, data: { confirmed: true, plan: sub?.plan?.code || null, amount: payment?.amount } });
    }

    // Mode réel : vérifie si le paiement est complété
    const payment = await prisma.payment.findFirst({
      where: { providerRef: ref, userId: req.user.id },
    });

    if (!payment) {
      return res.json({ success: true, data: { confirmed: false } });
    }

    if (payment.status === 'COMPLETED') {
      if (payment.metadata?.type === 'tipster') {
        return res.json({ success: true, data: { confirmed: true, type: 'tipster', tipsterId: payment.metadata.tipsterId, amount: payment.amount } });
      }
      const sub = await prisma.subscription.findUnique({
        where: { userId: req.user.id },
        include: { plan: true },
      });
      return res.json({ success: true, data: { confirmed: true, plan: sub?.plan?.code || null, amount: payment.amount } });
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
      billingCycle: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
    });
    const { planId, billingCycle } = schema.parse(req.body);

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || plan.code === 'FREE') throw new AppError('Plan invalide', 400, 'INVALID_PLAN');

    const amount    = getPlanPrice(plan, billingCycle);
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
      description:       `Abonnement ${plan.displayName} — ${billingLabel(billingCycle)}`,
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

    // Claim atomique — voir commentaire détaillé dans handleWaveWebhook.
    const claimed = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data:  { status: 'COMPLETED' },
    });
    if (claimed.count === 0) return res.json({ received: true });

    const { planId, billingCycle } = payment.metadata;
    try {
      await activateSubscription(payment.userId, planId, billingCycle, payment.id);
    } catch (activationErr) {
      console.error(`[Webhook FedaPay] Échec activation après claim atomique — paymentId=${payment.id}:`, activationErr.message);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Webhook FedaPay] Erreur:', err.message);
    res.status(500).json({ error: 'Erreur interne' });
  }
}

// ─── Initier un paiement Flutterwave (carte internationale, devise étrangère) ─
// DORMANT — non branché au frontend (compte Flutterwave jamais activé faute
// du seuil de volume requis, cf. décision produit). PayTech est désormais
// l'unique processeur actif de la plateforme (FCFA + devises étrangères).
// Code laissé en place au cas où Flutterwave redeviendrait pertinent.
async function initiateFlutterwavePayment(req, res, next) {
  try {
    const schema = z.object({
      planId:       z.string().uuid(),
      billingCycle: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
      currency:     z.enum(currencyService.getSupportedCurrencies().filter((c) => c !== 'XOF')),
    });
    const { planId, billingCycle, currency } = schema.parse(req.body);

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || plan.code === 'FREE') throw new AppError('Plan invalide', 400, 'INVALID_PLAN');

    const amountFcfa = getPlanPrice(plan, billingCycle);
    const chargedAmount = currencyService.convertFromXof(amountFcfa, currency);
    if (!chargedAmount) throw new AppError('Devise non supportée', 400, 'UNSUPPORTED_CURRENCY');

    const txRef = `FLW-${Date.now()}-${req.user.id.slice(0, 8)}`;

    const payment = await prisma.payment.create({
      data: {
        userId:      req.user.id,
        amount:      amountFcfa, // référence interne en FCFA (cohérence rapports admin)
        currency,
        method:      'CARD',
        status:      'PENDING',
        provider:    'flutterwave',
        providerRef: txRef,
        metadata:    { planId, billingCycle, chargedAmount, chargedCurrency: currency },
      },
    });

    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
    const redirectUrl = `${env.FRONTEND_URL}/abonnement/confirmation?ref=${txRef}`;

    const isSandbox = !env.FLUTTERWAVE_SECRET_KEY;
    const fwData = isSandbox
      ? flutterwaveService.mockPayment({ amount: chargedAmount, currency, txRef, redirectUrl })
      : await flutterwaveService.createPayment({
          amount: chargedAmount,
          currency,
          txRef,
          customerEmail: req.user.email,
          customerName:  profile?.displayName || req.user.username,
          redirectUrl,
          meta: { paymentId: payment.id, planId, billingCycle, userId: req.user.id },
        });

    res.json({
      success: true,
      data: {
        paymentId:   payment.id,
        checkoutUrl: fwData.link,
        reference:   txRef,
        sandbox:     isSandbox,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Webhook Flutterwave ───────────────────────────────────────────────────────
async function handleFlutterwaveWebhook(req, res) {
  const verifHash = req.headers['verif-hash'];

  if (!flutterwaveService.verifyWebhookSignature(verifHash)) {
    console.warn('[Webhook Flutterwave] Signature invalide (verif-hash)');
    return res.status(401).json({ error: 'Signature invalide' });
  }

  // Répondre 200 immédiatement, traiter ensuite (Flutterwave retente sinon)
  res.json({ received: true });

  try {
    const { event, data } = req.body || {};
    if (event !== 'charge.completed' || !data) {
      console.log(`[Webhook Flutterwave] Événement ignoré: ${event}`);
      return;
    }

    // Ne jamais faire confiance au payload webhook seul — revérifier auprès
    // de l'API Flutterwave (montant, devise, statut réels).
    const verified = await flutterwaveService.verifyTransaction(data.id);
    if (!verified || verified.status !== 'successful') {
      console.warn(`[Webhook Flutterwave] Vérification échouée ou statut non réussi — tx_ref=${data.tx_ref}`);
      return;
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { providerRef: verified.tx_ref },
          { id: verified.meta?.paymentId },
        ],
        status:   'PENDING',
        provider: 'flutterwave',
      },
    });

    if (!payment) {
      console.warn(`[Webhook Flutterwave] Paiement PENDING introuvable — tx_ref=${verified.tx_ref}`);
      return;
    }

    // Garde-fou : le montant/devise réellement payés doivent correspondre à
    // ce qui a été facturé (protection contre une manipulation côté client).
    const expected = payment.metadata?.chargedAmount;
    if (expected && Math.round(verified.amount) < Math.round(expected)) {
      console.error(`[Webhook Flutterwave] Montant payé (${verified.amount} ${verified.currency}) < attendu (${expected}) — paymentId=${payment.id}`);
      return;
    }

    // Claim atomique — voir commentaire détaillé dans handleWaveWebhook.
    const claimed = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data:  { status: 'COMPLETED', transactionId: String(data.id) },
    });
    if (claimed.count === 0) return;

    try {
      if (payment.metadata?.type === 'tipster') {
        const { tipsterId, planId } = payment.metadata;
        await activateTipsterSubscription(payment.userId, tipsterId, planId, payment.id);
        console.log(`[Webhook Flutterwave] ✅ Abonnement tipster activé pour userId=${payment.userId} → tipster=${tipsterId}`);
      } else {
        const { planId, billingCycle } = payment.metadata;
        await activateSubscription(payment.userId, planId, billingCycle, payment.id);
        console.log(`[Webhook Flutterwave] ✅ Abonnement activé pour userId=${payment.userId}`);
      }
    } catch (activationErr) {
      console.error(`[Webhook Flutterwave] Échec activation après claim atomique — paymentId=${payment.id}:`, activationErr.message);
    }
  } catch (err) {
    console.error('[Webhook Flutterwave] Erreur traitement asynchrone:', err.message, err.stack);
  }
}

// ─── Initier un paiement Flutterwave pour s'abonner au plan payant d'un TIPSTER ─
async function initiateTipsterFlutterwavePayment(req, res, next) {
  try {
    const schema = z.object({
      tipsterId: z.string().uuid(),
      currency:  z.enum(currencyService.getSupportedCurrencies().filter((c) => c !== 'XOF')),
    });
    const { tipsterId, currency } = schema.parse(req.body);

    if (tipsterId === req.user.id) {
      throw new AppError('Vous ne pouvez pas vous abonner à vous-même', 400, 'SELF_SUBSCRIBE');
    }

    const plan = await prisma.tipsterPlan.findUnique({ where: { tipsterId } });
    if (!plan || !plan.isActive) throw new AppError('Plan introuvable', 404, 'NOT_FOUND');

    const existing = await prisma.tipsterSubscription.findUnique({
      where: { subscriberId_planId: { subscriberId: req.user.id, planId: plan.id } },
    });
    if (existing && existing.status === 'ACTIVE' && existing.endDate && existing.endDate > new Date()) {
      throw new AppError('Déjà abonné à ce tipster', 409, 'ALREADY_SUBSCRIBED');
    }

    const chargedAmount = currencyService.convertFromXof(plan.price, currency);
    if (!chargedAmount) throw new AppError('Devise non supportée', 400, 'UNSUPPORTED_CURRENCY');

    const txRef = `FLWT-${Date.now()}-${req.user.id.slice(0, 8)}`;

    const payment = await prisma.payment.create({
      data: {
        userId:      req.user.id,
        amount:      plan.price,
        currency,
        method:      'CARD',
        status:      'PENDING',
        provider:    'flutterwave',
        providerRef: txRef,
        metadata:    { type: 'tipster', tipsterId, planId: plan.id, chargedAmount, chargedCurrency: currency },
      },
    });

    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
    const redirectUrl = `${env.FRONTEND_URL}/abonnement/confirmation?ref=${txRef}&type=tipster&tipsterId=${tipsterId}`;

    const isSandbox = !env.FLUTTERWAVE_SECRET_KEY;
    const fwData = isSandbox
      ? flutterwaveService.mockPayment({ amount: chargedAmount, currency, txRef, redirectUrl })
      : await flutterwaveService.createPayment({
          amount: chargedAmount,
          currency,
          txRef,
          customerEmail: req.user.email,
          customerName:  profile?.displayName || req.user.username,
          redirectUrl,
          meta: { paymentId: payment.id, type: 'tipster', tipsterId, planId: plan.id, userId: req.user.id },
        });

    res.json({
      success: true,
      data: {
        paymentId:   payment.id,
        checkoutUrl: fwData.link,
        reference:   txRef,
        sandbox:     isSandbox,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  initiateWavePayment, handleWaveWebhook,
  initiatePaytechPayment, handlePaytechWebhook,
  initiateTipsterPaytechPayment,
  initiateFedapayPayment, handleFedapayWebhook,
  initiateFlutterwavePayment, handleFlutterwaveWebhook,
  initiateTipsterFlutterwavePayment,
  verifyPayment,
};
