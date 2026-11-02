// ─── Jetons secrets stockés sous forme d'empreinte ────────────────────────────
// Refresh tokens (sessions de 30 jours), liens de réinitialisation de mot de
// passe et de vérification d'email : la valeur réelle n'existe que dans le
// cookie / l'email de l'utilisateur. La base ne garde que son empreinte
// SHA-256 — en cas de fuite de la base, les jetons volés sont inutilisables
// (impossible de reprendre une session ou de réinitialiser un mot de passe).
// SHA-256 suffit ici (pas bcrypt) : les jetons sont aléatoires et longs
// (crypto.randomBytes), donc impossibles à retrouver par force brute.
const crypto = require('crypto');

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

// Recherche compatible avec les jetons créés AVANT ce changement (stockés en
// clair) : ils restent valides jusqu'à leur expiration naturelle, personne
// n'est déconnecté au déploiement. Les nouveaux sont tous stockés hachés.
function tokenLookup(token) {
  return { in: [hashToken(token), String(token)] };
}

module.exports = { hashToken, tokenLookup };
