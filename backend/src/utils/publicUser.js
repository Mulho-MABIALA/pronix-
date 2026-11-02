// ─── Champs d'un utilisateur affichables publiquement ─────────────────────────
// À utiliser dans TOUTE requête Prisma dont le résultat part vers un autre
// utilisateur (pronostics d'un match, classement, profil public, recherche).
// Avant : `user: { include: { profile: true } }` renvoyait la ligne User
// complète — email, empreinte du mot de passe (bcrypt), googleId, note admin,
// rôle… et le profil complet avec le numéro de téléphone — à n'importe quel
// visiteur, même non connecté (ex. GET /api/matches/:id).
const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  createdAt: true,
  profile: { select: { displayName: true, avatar: true, bio: true } },
};

const PUBLIC_USER_WITH_STATS_SELECT = {
  ...PUBLIC_USER_SELECT,
  tipsterStats: true,
};

module.exports = { PUBLIC_USER_SELECT, PUBLIC_USER_WITH_STATS_SELECT };

// Données renvoyées à l'utilisateur sur SON propre compte (connexion, /me…) :
// tout sauf l'empreinte du mot de passe, la note interne de l'admin et le
// challenge WebAuthn en cours (données techniques ou internes).
function toSelfUser(user) {
  if (!user) return user;
  const { password, adminNote, currentChallenge, ...safe } = user; // eslint-disable-line no-unused-vars
  return safe;
}

module.exports.toSelfUser = toSelfUser;
