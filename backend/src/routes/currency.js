const express = require('express');
const { getXofRates, getCacheInfo } = require('../services/currencyService');

const router = express.Router();

// GET /api/currency/rates — taux XOF (FCFA) -> devises, à titre indicatif.
// Le paiement réel reste toujours en FCFA via les moyens actuels.
router.get('/rates', (req, res) => {
  const info = getCacheInfo();
  res.json({
    success: true,
    data: {
      base: 'XOF',
      rates: getXofRates(),
      updatedAt: info.updatedAt,
      currencies: info.currencies,
      disclaimer: 'Conversion indicative — le paiement réel se fait en FCFA via les moyens de paiement actuels.',
    },
  });
});

module.exports = router;
