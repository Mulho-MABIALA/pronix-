// ─────────────────────────────────────────────────────────────────────────────
// Flutterwave — passerelle carte bancaire internationale (Visa/Mastercard) et
// devises étrangères (USD, EUR, GBP, BRL, MXN, CAD, ZAR — cf. currencyService).
// DORMANT — non branché au frontend, PayTech est l'unique processeur actif
// (FCFA + devises étrangères). Code laissé en place au cas où.
//
// Doc API Standard : https://developer.flutterwave.com/docs/collecting-payments/standard
const env = require('../config/env');

const BASE_URL = env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3';

function getHeaders() {
  return {
    'Authorization': `Bearer ${env.FLUTTERWAVE_SECRET_KEY || ''}`,
    'Content-Type': 'application/json',
  };
}

// ─── Initier un paiement (Standard Checkout — page hébergée Flutterwave) ─────
async function createPayment({ amount, currency, txRef, customerEmail, customerName, redirectUrl, meta }) {
  const { AppError } = require('../middleware/errorHandler');
  const url = `${BASE_URL}/payments`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      tx_ref: txRef,
      amount,
      currency,
      redirect_url: redirectUrl,
      customer: { email: customerEmail, name: customerName },
      meta,
      customizations: {
        title: 'fpronix',
        description: 'Abonnement fpronix',
      },
    }),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    console.error(`[Flutterwave] Réponse non-JSON (${response.status}) depuis ${url}:`, text.slice(0, 300));
    throw new AppError(
      `L'API Flutterwave est inaccessible (${response.status}). Vérifiez les clés API.`,
      502,
      'PAYMENT_GATEWAY_ERROR'
    );
  }

  const json = await response.json();

  if (json.status !== 'success' || !json.data?.link) {
    const msg = json?.message || `Flutterwave error ${response.status}`;
    console.error('[Flutterwave] Erreur API:', response.status, JSON.stringify(json));
    throw new AppError(`Paiement Flutterwave : ${msg}`, 502, 'PAYMENT_GATEWAY_ERROR');
  }

  return json.data; // { link, ... }
}

// ─── Vérifier une transaction auprès de Flutterwave (source de vérité) ───────
// Flutterwave recommande explicitement de revérifier via l'API plutôt que de
// faire confiance aux données du webhook (montant/devise/statut).
async function verifyTransaction(transactionId) {
  const response = await fetch(`${BASE_URL}/transactions/${transactionId}/verify`, {
    headers: getHeaders(),
  });
  const json = await response.json();
  if (json.status !== 'success') return null;
  return json.data; // { status, amount, currency, tx_ref, ... }
}

// ─── Vérifier le webhook (secret hash statique, PAS de HMAC) ─────────────────
// Flutterwave envoie l'en-tête "verif-hash" = valeur exacte configurée dans
// Dashboard > Settings > Webhooks. Comparaison en temps constant.
function verifyWebhookSignature(verifHashHeader) {
  const secret = env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!secret) return true; // pas de secret configuré → skip (dev)
  if (!verifHashHeader) return false;

  const crypto = require('crypto');
  try {
    const a = Buffer.from(String(verifHashHeader));
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── Simuler un paiement réussi (sandbox / mode dev sans clés) ───────────────
function mockPayment({ amount, currency, txRef, redirectUrl }) {
  const link = `${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}mock=1`;
  return { link, tx_ref: txRef, amount, currency, status: 'pending' };
}

module.exports = { createPayment, verifyTransaction, verifyWebhookSignature, mockPayment };
