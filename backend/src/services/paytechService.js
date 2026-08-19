// Service PayTech (paytech.sn / groupe Intech) — agrégateur Sénégal, Côte
// d'Ivoire, Mali, Bénin (Orange Money, Wave, Free Money, Wizall, Mtn/Moov
// Money, Carte Bancaire) + devises étrangères (XOF, EUR, USD, CAD, GBP, MAD)
// pour les paiements par carte internationale. Remplace CinetPay.
// Doc officielle : https://docs.intech.sn/doc_paytech.php
const axios = require('axios');
const crypto = require('crypto');
const env = require('../config/env');

const paytechClient = axios.create({
  baseURL: env.PAYTECH_BASE_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15000,
});

// Initie une demande de paiement PayTech. targetPayment: '' (toutes les
// méthodes disponibles — paiement FCFA local) ou 'Carte Bancaire' (carte
// internationale, devise étrangère — le Mobile Money n'existe qu'en FCFA).
async function requestPayment({ amount, currency = 'XOF', refCommand, itemName, commandName, customField, targetPayment = '' }) {
  if (!env.PAYTECH_API_KEY) {
    console.warn('[PayTech] API non configurée — simulation de paiement');
    return {
      success: 1,
      token: `mock-token-${Date.now()}`,
      redirect_url: `${env.FRONTEND_URL}/abonnement/confirmation?mock=1&ref=${refCommand}`,
    };
  }

  const response = await paytechClient.post(
    '/payment/request-payment',
    {
      item_name: itemName,
      item_price: amount,
      currency,
      ref_command: refCommand,
      command_name: commandName,
      target_payment: targetPayment,
      env: env.PAYTECH_ENV,
      ipn_url: `${env.BACKEND_URL}/api/payments/paytech/webhook`,
      success_url: `${env.FRONTEND_URL}/abonnement/confirmation?ref=${refCommand}`,
      cancel_url: `${env.FRONTEND_URL}/abonnement/erreur?ref=${refCommand}`,
      custom_field: JSON.stringify(customField || {}),
    },
    {
      headers: {
        API_KEY: env.PAYTECH_API_KEY,
        API_SECRET: env.PAYTECH_API_SECRET,
      },
    }
  );

  return response.data;
}

// Vérifie le statut d'un paiement auprès de PayTech (reconfirmation possible
// avant activation, en plus de la vérification HMAC sur l'IPN).
async function checkStatus(token) {
  if (!env.PAYTECH_API_KEY) {
    return { success: 1, data: { status: 'success' } };
  }
  const response = await paytechClient.get('/payment/get-status', {
    params: { token_payment: token },
    headers: { API_KEY: env.PAYTECH_API_KEY, API_SECRET: env.PAYTECH_API_SECRET },
  });
  return response.data;
}

// Vérifie l'authenticité d'une notification IPN — méthode HMAC-SHA256
// (recommandée par PayTech) : message = "item_price|ref_command|api_key",
// signé avec la clé secrète, comparé au champ hmac_compute reçu.
function verifyIpnHmac({ itemPrice, refCommand, hmacCompute }) {
  if (!env.PAYTECH_API_KEY || !env.PAYTECH_API_SECRET) {
    // Sandbox local uniquement (pas de clés configurées) — en production,
    // des clés manquantes/mal nommées ne doivent JAMAIS désactiver
    // silencieusement la vérification de signature (ça permettrait d'activer
    // un abonnement gratuitement avec un ref_command deviné). On fail-closed
    // et on logue fort pour que ce soit visible immédiatement (Sentry/PM2).
    if (env.NODE_ENV === 'production') {
      console.error('[PayTech] CRITIQUE: PAYTECH_API_KEY/SECRET absents en production — webhook IPN rejeté par sécurité.');
      return false;
    }
    return true; // mode sandbox (dev/test, clés absentes intentionnellement)
  }
  if (!hmacCompute) return false;
  const message = `${itemPrice}|${refCommand}|${env.PAYTECH_API_KEY}`;
  const expected = crypto.createHmac('sha256', env.PAYTECH_API_SECRET).update(message).digest('hex');
  return expected === hmacCompute;
}

// Parse le payload IPN envoyé par PayTech (form-urlencoded ou JSON selon le
// client HTTP de PayTech — Express le parse dans les deux cas via les
// middlewares globaux). custom_field y est encodé en Base64, contrairement à
// la requête sortante où c'est du JSON brut.
function parseIpnPayload(body) {
  let customField = {};
  try {
    customField = JSON.parse(Buffer.from(body.custom_field || '', 'base64').toString('utf8'));
  } catch {
    // champ vide ou non-JSON — ignoré, traité comme absent
  }

  return {
    typeEvent: body.type_event,
    refCommand: body.ref_command,
    token: body.token,
    itemPrice: Number(body.item_price),
    itemPriceXof: Number(body.item_price_xof ?? body.item_price),
    currency: body.currency,
    paymentMethod: body.payment_method,
    hmacCompute: body.hmac_compute,
    customField,
  };
}

module.exports = { requestPayment, checkStatus, verifyIpnHmac, parseIpnPayload };
