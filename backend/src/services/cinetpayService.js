// Service CinetPay — agrégateur paiement UEMOA (Visa/Mastercard + Wave via agrégateur)
const axios = require('axios');
const env = require('../config/env');

const cinetpayClient = axios.create({
  baseURL: env.CINETPAY_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Initialise une transaction CinetPay
async function initTransaction({ amount, currency = 'XOF', transactionId, description, customerName, customerEmail }) {
  if (!env.CINETPAY_API_KEY) {
    console.warn('[CinetPay] API non configurée — simulation de paiement');
    return {
      code: '201',
      data: {
        payment_url: `${env.FRONTEND_URL}/abonnement/confirmation?mock=1&ref=${transactionId}`,
        payment_token: `mock-token-${Date.now()}`,
      },
    };
  }

  const response = await cinetpayClient.post('/payment', {
    apikey: env.CINETPAY_API_KEY,
    site_id: env.CINETPAY_SITE_ID,
    transaction_id: transactionId,
    amount,
    currency,
    description,
    notify_url: env.CINETPAY_NOTIFY_URL,
    return_url: env.CINETPAY_RETURN_URL,
    customer_name: customerName,
    customer_email: customerEmail,
    channels: 'MOBILE_MONEY,CREDIT_CARD',
    lang: 'fr',
  });

  return response.data;
}

// Vérifie le statut d'une transaction CinetPay (appelé dans le webhook)
async function checkTransactionStatus(transactionId) {
  if (!env.CINETPAY_API_KEY) {
    return { code: '00', data: { status: 'ACCEPTED', payment_method: 'CREDIT_CARD' } };
  }

  const response = await cinetpayClient.post('/payment/check', {
    apikey: env.CINETPAY_API_KEY,
    site_id: env.CINETPAY_SITE_ID,
    transaction_id: transactionId,
  });

  return response.data;
}

// Parse les données du webhook CinetPay
function parseWebhookPayload(body) {
  const data = typeof body === 'string' ? JSON.parse(body) : body;
  return {
    transactionId: data.cpm_trans_id,
    status: data.cpm_result,       // '00' = succès
    amount: data.cpm_amount,
    paymentMethod: data.cpm_payment_type,
  };
}

module.exports = { initTransaction, checkTransactionStatus, parseWebhookPayload };
