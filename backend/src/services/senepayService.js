// Service SenePay (sene-pay.com) — agrégateur Mobile Money Sénégal/Afrique de
// l'Ouest/Centrale (Wave, Orange Money, Free Money, E-money, MTN, Moov,
// Airtel, T-Money — 6 pays). KYC individuel (CNI/passeport + selfie, pas de
// RCCM/NINEA) — remplace PayTech comme processeur principal FCFA.
// Doc officielle : https://api.sene-pay.com/docs.html
const axios = require('axios');
const crypto = require('crypto');
const env = require('../config/env');

const senepayClient = axios.create({
  baseURL: env.SENEPAY_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

function authHeaders() {
  return { 'X-Api-Key': env.SENEPAY_API_KEY, 'X-Api-Secret': env.SENEPAY_API_SECRET };
}

// Crée une session de paiement (checkout hébergé) — le client est redirigé
// vers checkoutUrl, qui gère le choix du pays/opérateur/téléphone/OTP.
// country omis volontairement : fpronix cible toute l'Afrique de l'Ouest/
// Centrale francophone, pas seulement le Sénégal — laisser le client choisir
// son pays parmi ceux supportés par SenePay plutôt que de le figer sur SN.
async function createCheckoutSession({ amount, currency = 'XOF', orderReference, description, returnUrl, cancelUrl, webhookUrl, metadata }) {
  if (!env.SENEPAY_API_KEY) {
    console.warn('[SenePay] API non configurée — simulation de paiement');
    return {
      sessionToken: `mock-session-${Date.now()}`,
      checkoutUrl: `${env.FRONTEND_URL}/abonnement/confirmation?mock=1&ref=${orderReference}`,
      status: 'Open',
    };
  }

  const response = await senepayClient.post(
    '/api/v1/checkout/sessions',
    { amount, currency, orderReference, description, returnUrl, cancelUrl, webhookUrl, metadata },
    { headers: authHeaders() }
  );
  return response.data;
}

// Vérifie le statut d'une session (reconfirmation possible avant activation,
// en plus de la vérification HMAC sur le webhook).
async function checkSessionStatus(sessionToken) {
  if (!env.SENEPAY_API_KEY) {
    return { status: 'Complete' };
  }
  const response = await senepayClient.get(`/api/v1/checkout/sessions/${sessionToken}`, {
    headers: authHeaders(),
  });
  return response.data;
}

// Vérifie l'authenticité d'une notification webhook — HMAC-SHA256 du corps
// BRUT (avant tout parsing JSON), avec le webhookSigningSecret (whsec_...),
// jamais le X-Api-Secret. rawBody doit être le Buffer/string brut reçu (cf.
// app.js — express.raw() monté sur cette route avant les parseurs JSON
// globaux, comme pour le webhook Wave).
function verifyWebhookSignature(rawBody, signature) {
  if (!env.SENEPAY_WEBHOOK_SECRET) {
    // Clé manquante en production ne doit JAMAIS désactiver silencieusement
    // la vérification (permettrait d'activer un abonnement gratuitement avec
    // une orderReference devinée) — fail-closed, cf. même garde dans
    // paytechService.verifyIpnHmac.
    if (env.NODE_ENV === 'production') {
      console.error('[SenePay] CRITIQUE: SENEPAY_WEBHOOK_SECRET absent en production — webhook rejeté par sécurité.');
      return false;
    }
    return true; // sandbox local (clé absente intentionnellement)
  }
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', env.SENEPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false; // longueurs différentes → signature invalide, jamais une exception
  }
}

// Parse le payload webhook (JSON déjà parsé, après vérification de signature
// sur le corps brut).
function parseWebhookPayload(body) {
  return {
    event: body.event, // 'checkout.session.completed' | 'checkout.session.failed'
    sessionToken: body.sessionToken,
    orderReference: body.orderReference,
    status: body.status, // 'Complete' | 'Failed' (sans 'd')
    amount: Number(body.amount),
    currency: body.currency,
    netAmount: Number(body.netAmount),
    transactionId: body.transactionId, // SENEPAY_PAYIN_xxx
    metadata: body.metadata || {},
  };
}

module.exports = { createCheckoutSession, checkSessionStatus, verifyWebhookSignature, parseWebhookPayload };
