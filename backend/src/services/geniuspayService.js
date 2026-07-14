const crypto = require('crypto');
const env = require('../config/env');

const BASE_URL = env.GENIUSPAY_BASE_URL || 'https://geniuspay.ci/api/v1/merchant';

// ─── Headers d'authentification ──────────────────────────────────────────────
function getHeaders() {
  return {
    'X-API-Key':    env.GENIUSPAY_API_KEY    || '',
    'X-API-Secret': env.GENIUSPAY_API_SECRET || '',
    'Content-Type': 'application/json',
  };
}

// ─── Créer un paiement (mode checkout — le client choisit son moyen) ─────────
async function createCheckout({ amount, description, successUrl, errorUrl, metadata }) {
  const url = `${BASE_URL}/payments`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      amount,
      currency: 'XOF',
      description,
      success_url: successUrl,
      error_url:   errorUrl,
      metadata,
    }),
  });

  const { AppError } = require('../middleware/errorHandler');

  // Vérifier que la réponse est bien du JSON (pas une page HTML d'erreur)
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    console.error(`[GeniusPay] Réponse non-JSON (${response.status}) depuis ${url}:`, text.slice(0, 300));
    throw new AppError(
      `L'API GeniusPay est inaccessible (${response.status}). Vérifiez l'URL et les clés API.`,
      502,
      'PAYMENT_GATEWAY_ERROR'
    );
  }

  const json = await response.json();

  if (!response.ok || !json.success) {
    const msg = json?.error?.message || json?.message || `Geniuspay error ${response.status}`;
    console.error('[GeniusPay] Erreur API:', response.status, JSON.stringify(json));
    throw new AppError(`Paiement GeniusPay : ${msg}`, 502, 'PAYMENT_GATEWAY_ERROR');
  }

  return json.data; // { id, reference, checkout_url, ... }
}

// ─── Récupérer une transaction par référence ──────────────────────────────────
async function getTransaction(reference) {
  const response = await fetch(`${BASE_URL}/payments/${reference}`, {
    headers: getHeaders(),
  });

  const json = await response.json();
  if (!response.ok || !json.success) return null;
  return json.data;
}

// ─── Vérifier la signature du webhook ────────────────────────────────────────
// Format : HMAC-SHA256(timestamp + "." + rawBody, webhookSecret)
function verifyWebhookSignature(rawBody, timestamp, signature) {
  const secret = env.GENIUSPAY_WEBHOOK_SECRET;
  if (!secret) return true; // pas de secret configuré → skip (dev)

  const payload   = `${timestamp}.${rawBody}`;
  const expected  = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
}

// ─── Simuler un paiement réussi (sandbox / mode dev) ─────────────────────────
// Retourne un objet qui imite la réponse de l'API sandbox
function mockCheckout({ amount, description, successUrl, metadata }) {
  const reference = `MTX-MOCK-${Date.now()}`;
  const checkoutUrl = `${env.FRONTEND_URL}/abonnement/confirmation?ref=${reference}&mock=1`;
  return { id: 0, reference, amount, currency: 'XOF', status: 'pending', checkout_url: checkoutUrl, payment_url: checkoutUrl };
}

module.exports = { createCheckout, getTransaction, verifyWebhookSignature, mockCheckout };
