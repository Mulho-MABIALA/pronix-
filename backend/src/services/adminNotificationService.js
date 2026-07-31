const prisma = require('../config/database');

// Flux d'activité destiné à la cloche du dashboard admin (distinct des push
// notifications envoyées aux utilisateurs finaux). Un événement métier crée
// une entrée via notifyAdmin() ; la cloche du frontend admin poll ces entrées.
// Volontairement best-effort : une erreur ici ne doit jamais faire échouer
// l'action métier qui l'a déclenchée (inscription, paiement, etc.).
async function notifyAdmin({ type, title, message, link }) {
  try {
    await prisma.adminNotification.create({
      data: { type, title, message, link: link || null },
    });
  } catch (err) {
    console.error('[AdminNotification] échec création:', err.message || err);
  }
}

module.exports = { notifyAdmin };
