const env = require('../config/env');

// Bloque une route quand la fonctionnalité est désactivée (cf. FEATURE_* dans
// config/env.js). 404 plutôt que 403 : pour le client, la fonctionnalité
// n'existe simplement pas en ce moment.
function requireFeature(name) {
  const key = `FEATURE_${name.toUpperCase()}`;
  return (req, res, next) => {
    if (env[key]) return next();
    return res.status(404).json({ success: false, code: 'FEATURE_DISABLED', message: 'Fonctionnalité indisponible' });
  };
}

module.exports = { requireFeature };
