// Service Wave — API de paiement mobile Sénégal
const axios = require('axios');
const crypto = require('crypto');
const env = require('../config/env');

const waveClient = axios.create({
  baseURL: env.WAVE_BASE_URL,
  headers: {
    Authorization: `Bearer ${env.WAVE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Crée une session de paiement Wave (checkout URL)
async function createCheckoutSession({ amount, currency = 'XOF', clientReference, successUrl, errorUrl }) {
  if (!env.WAVE_API_KEY) {
    console.warn('[Wave] API non configurée — simulation de paiement');
    return {
      id: `mock-wave-${Date.now()}`,
      wave_launch_url: `${env.FRONTEND_URL}/abonnement/confirmation?mock=1&ref=${clientReference}`,
      client_reference: clientReference,
    };
  }

  const response = await waveClient.post('/checkout/sessions', {
    amount: String(amount),
    currency,
    client_reference: clientReference,
    success_url: successUrl,
    error_url: errorUrl,
  });

  return response.data;
}

// Vérifie la signature HMAC d'un webhook Wave
function verifyWebhookSignature(rawBody, signature) {
  if (!env.WAVE_WEBHOOK_SECRET) return true; // passer en développement

  const expected = crypto
    .createHmac('sha256', env.WAVE_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// Parse le payload d'un webhook Wave
function parseWebhookPayload(rawBody) {
  const payload = JSON.parse(rawBody.toString());
  return {
    eventType: payload.type,         // 'checkout.session.completed'
    clientReference: payload.data?.client_reference,
    transactionId: payload.data?.id,
    amount: payload.data?.amount,
    status: payload.data?.payment_status, // 'succeeded' | 'failed'
  };
}

module.exports = { createCheckoutSession, verifyWebhookSignature, parseWebhookPayload };
