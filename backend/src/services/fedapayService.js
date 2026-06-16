// Service FedaPay — paiements mobile money + carte (Wave, Orange Money, MTN, Visa/MC)
const FedaPay = require('fedapay');
const env = require('../config/env');

function initFedaPay() {
  FedaPay.FedaPay.setApiKey(env.FEDAPAY_SECRET_KEY || 'sk_sandbox_xxx');
  FedaPay.FedaPay.setEnvironment(
    env.NODE_ENV === 'production' ? 'production' : 'sandbox'
  );
}

// Crée une transaction et retourne l'URL de paiement hébergée
async function createTransaction({ amount, description, customerEmail, customerFirstname, customerLastname, reference }) {
  if (!env.FEDAPAY_SECRET_KEY) {
    console.warn('[FedaPay] Clé API non configurée — simulation');
    return {
      transactionId: `mock-fp-${Date.now()}`,
      paymentUrl: `${env.FRONTEND_URL}/abonnement/confirmation?mock=1&ref=${reference}`,
    };
  }

  initFedaPay();

  const transaction = await FedaPay.Transaction.create({
    description,
    amount,
    currency:     { iso: 'XOF' },
    callback_url: `${env.FRONTEND_URL}/abonnement/confirmation?ref=${reference}`,
    customer: {
      firstname: customerFirstname || 'Client',
      lastname:  customerLastname  || 'StatFoot',
      email:     customerEmail,
    },
  });

  const tokenObj = await transaction.generateToken();

  return {
    transactionId: String(transaction.id),
    paymentUrl:    tokenObj.url,
  };
}

// Vérifie et récupère une transaction FedaPay depuis son ID
async function getTransaction(fedapayId) {
  if (!env.FEDAPAY_SECRET_KEY) return null;
  initFedaPay();
  return FedaPay.Transaction.retrieve(fedapayId);
}

// Parse le webhook FedaPay (payload JSON brut)
function parseWebhook(rawBody) {
  const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  return {
    event:         payload.event,            // 'transaction.approved' | 'transaction.declined' …
    transactionId: String(payload.object?.id || payload.transaction_id || ''),
    status:        payload.object?.status || '', // 'approved' | 'declined' | 'canceled'
  };
}

module.exports = { createTransaction, getTransaction, parseWebhook };
