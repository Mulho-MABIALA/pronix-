const crypto = require('crypto');
const env = require('../config/env');

const BASE_URL = env.PAYDUNYA_BASE_URL || 'https://app.paydunya.com/api/v1';

// ─── Headers d'authentification ──────────────────────────────────────────────
function getHeaders() {
  return {
    'PAYDUNYA-MASTER-KEY':  env.PAYDUNYA_MASTER_KEY  || '',
    'PAYDUNYA-PRIVATE-KEY': env.PAYDUNYA_PRIVATE_KEY || '',
    'PAYDUNYA-PUBLIC-KEY':  env.PAYDUNYA_PUBLIC_KEY  || '',
    'PAYDUNYA-TOKEN':       env.PAYDUNYA_TOKEN       || '',
    'Content-Type':         'application/json',
    'Accept':               'application/json',
  };
}

// ─── Créer une facture de paiement (checkout invoice) ────────────────────────
async function createInvoice({ amount, description, returnUrl, cancelUrl, callbackUrl, customData }) {
  const url = `${BASE_URL}/checkout-invoice/create`;
  const { AppError } = require('../middleware/errorHandler');

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      invoice: {
        total_amount: amount,
        description,
      },
      store: {
        name: env.PAYDUNYA_STORE_NAME || 'fpronix',
      },
      actions: {
        cancel_url:   cancelUrl,
        return_url:   returnUrl,
        callback_url: callbackUrl,
      },
      custom_data: customData,
    }),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    console.error(`[PayDunya] Réponse non-JSON (${response.status}) depuis ${url}:`, text.slice(0, 300));
    throw new AppError(
      `L'API PayDunya est inaccessible (${response.status}). Vérifiez l'URL et les clés API.`,
      502,
      'PAYMENT_GATEWAY_ERROR'
    );
  }

  const json = await response.json();

  if (json.response_code !== '00') {
    console.error('[PayDunya] Erreur API:', response.status, JSON.stringify(json));
    throw new AppError(`Paiement PayDunya : ${json.response_text || 'erreur inconnue'}`, 502, 'PAYMENT_GATEWAY_ERROR');
  }

  return {
    token:       json.token,
    checkout_url: `https://paydunya.com/checkout/invoice/${json.token}`,
  };
}

// ─── Confirmer le statut réel d'une facture auprès de PayDunya ───────────────
async function confirmInvoice(token) {
  const response = await fetch(`${BASE_URL}/checkout-invoice/confirm/${token}`, {
    headers: getHeaders(),
  });

  const json = await response.json();
  if (!response.ok) return null;
  return json; // { status: 'completed' | 'pending' | 'cancelled', custom_data, ... }
}

// ─── Vérifier le hash envoyé dans l'IPN (sha512 de la clé privée) ────────────
function verifyWebhookHash(hash) {
  const privateKey = env.PAYDUNYA_PRIVATE_KEY;
  if (!privateKey) return true; // pas de clé configurée → skip (dev)
  if (!hash) return false;

  try {
    const expected = crypto.createHash('sha512').update(privateKey).digest('hex');
    const expBuf = Buffer.from(expected);
    const hashBuf = Buffer.from(hash);
    if (expBuf.length !== hashBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, hashBuf);
  } catch (e) {
    console.error('[PayDunya] Erreur vérification hash:', e.message);
    return false;
  }
}

// ─── Simuler un paiement réussi (sandbox / mode dev sans clés) ───────────────
function mockCheckout({ customData }) {
  const token = `MOCK-${Date.now()}`;
  const checkoutUrl = `${env.FRONTEND_URL}/abonnement/confirmation?ref=${token}&mock=1`;
  return { token, checkout_url: checkoutUrl, custom_data: customData };
}

module.exports = { createInvoice, confirmInvoice, verifyWebhookHash, mockCheckout };
