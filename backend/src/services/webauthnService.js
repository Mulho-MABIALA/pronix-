// ─── Connexion biométrique (passkeys / WebAuthn) ───────────────────────────
// Standard W3C ouvert : Face ID, Touch ID, empreinte Android, Windows Hello.
// Deux cérémonies distinctes :
//   1. Enregistrement — utilisateur déjà connecté, ajoute un appareil.
//   2. Authentification — utilisateur PAS encore connecté, login "usernameless"
//      (aucun email demandé : le navigateur propose directement les passkeys
//      enregistrées pour ce domaine, l'utilisateur choisit et confirme via
//      empreinte/Face ID). L'identité est retrouvée via la credential utilisée,
//      pas via un identifiant saisi.
//
// Le backend tourne en cluster PM2 (plusieurs process derrière le même port) :
// le challenge de LOGIN (utilisateur anonyme, donc pas de ligne User où
// l'accrocher) est stocké dans la table WebAuthnChallenge (Postgres, partagée
// entre tous les process) plutôt qu'en mémoire — sinon la requête de
// vérification pourrait atterrir sur un autre process que celle qui a généré
// le challenge et échouer à tort ("session expirée"). Le challenge de
// REGISTRATION (utilisateur authentifié) est lui stocké sur User.currentChallenge,
// comme pour les flows email existants (vérification, reset mot de passe).
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { isoUint8Array } = require('@simplewebauthn/server/helpers');
const prisma = require('../config/database');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

const rpName = env.WEBAUTHN_RP_NAME;
const rpID = env.WEBAUTHN_RP_ID;
const origin = env.FRONTEND_URL;

// ─── Challenges de connexion (utilisateur anonyme) ─────────────────────────
const LOGIN_CHALLENGE_TTL_MS = 2 * 60 * 1000;

async function storeLoginChallenge(challenge) {
  // Nettoyage opportuniste des challenges expirés (pas de cron dédié : cette
  // table reste petite et se vide au fil des connexions).
  prisma.webAuthnChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});

  const row = await prisma.webAuthnChallenge.create({
    data: { challenge, expiresAt: new Date(Date.now() + LOGIN_CHALLENGE_TTL_MS) },
  });
  return row.id;
}

async function consumeLoginChallenge(challengeId) {
  let row;
  try {
    row = await prisma.webAuthnChallenge.delete({ where: { id: challengeId } }); // usage unique
  } catch {
    return null; // déjà consommé ou jamais existé
  }
  if (row.expiresAt < new Date()) return null;
  return row.challenge;
}

// ─── Enregistrement d'une passkey (utilisateur connecté) ───────────────────
async function getRegistrationOptions(user) {
  const existing = await prisma.webAuthnCredential.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: isoUint8Array.fromUTF8String(user.id),
    userName: user.email,
    userDisplayName: user.username || user.email,
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred', // "preferred" et non "required" : compatible avec le plus d'appareils
      userVerification: 'preferred',
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { currentChallenge: options.challenge },
  });

  return options;
}

async function verifyRegistration(user, response, deviceName) {
  if (!user.currentChallenge) {
    throw new AppError('Aucune demande d\'enregistrement de passkey en cours', 400, 'NO_PENDING_CHALLENGE');
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } finally {
    // Le challenge ne doit servir qu'une fois, succès ou échec
    await prisma.user.update({ where: { id: user.id }, data: { currentChallenge: null } });
  }

  if (!verification.verified || !verification.registrationInfo) {
    throw new AppError('Vérification de la passkey échouée', 400, 'WEBAUTHN_VERIFICATION_FAILED');
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  const alreadyExists = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: credential.id },
  });
  if (alreadyExists) {
    throw new AppError('Cette passkey est déjà enregistrée', 409, 'CREDENTIAL_ALREADY_EXISTS');
  }

  await prisma.webAuthnCredential.create({
    data: {
      userId: user.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports || [],
      deviceName: deviceName || null,
    },
  });

  return true;
}

// ─── Authentification (login usernameless) ─────────────────────────────────
// userId optionnel : utilisé par le step-up admin (voir adminStepUpOptions)
// pour restreindre le prompt aux seules passkeys du compte déjà identifié par
// mot de passe — plutôt que de proposer toutes les passkeys du domaine.
async function getAuthenticationOptions(userId = null) {
  let allowCredentials;
  if (userId) {
    const creds = await prisma.webAuthnCredential.findMany({
      where: { userId },
      select: { credentialId: true, transports: true },
    });
    allowCredentials = creds.map((c) => ({ id: c.credentialId, transports: c.transports }));
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    // allowCredentials omis (undefined) : le navigateur propose toutes les
    // passkeys "discoverable" du domaine (login usernameless classique).
    // Fourni : restreint aux passkeys du compte (step-up admin).
    allowCredentials,
  });

  const challengeId = await storeLoginChallenge(options.challenge);
  return { options, challengeId };
}

async function verifyAuthentication(challengeId, response) {
  const expectedChallenge = await consumeLoginChallenge(challengeId);
  if (!expectedChallenge) {
    throw new AppError('Session de connexion expirée, réessayez', 400, 'CHALLENGE_EXPIRED');
  }

  const stored = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: response.id },
    include: { user: { include: { profile: true, subscription: { include: { plan: true } } } } },
  });

  if (!stored || !stored.user.isActive) {
    throw new AppError('Passkey inconnue', 401, 'CREDENTIAL_NOT_FOUND');
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: stored.credentialId,
      publicKey: new Uint8Array(stored.publicKey),
      counter: Number(stored.counter),
      transports: stored.transports,
    },
  });

  if (!verification.verified) {
    throw new AppError('Vérification de la passkey échouée', 401, 'WEBAUTHN_VERIFICATION_FAILED');
  }

  await prisma.webAuthnCredential.update({
    where: { id: stored.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() },
  });

  return stored.user;
}

// ─── Gestion des appareils enregistrés ──────────────────────────────────────
async function listCredentials(userId) {
  const creds = await prisma.webAuthnCredential.findMany({
    where: { userId },
    select: { id: true, deviceName: true, deviceType: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return creds;
}

async function deleteCredential(userId, credentialRowId) {
  const cred = await prisma.webAuthnCredential.findUnique({ where: { id: credentialRowId } });
  if (!cred || cred.userId !== userId) {
    throw new AppError('Passkey introuvable', 404, 'CREDENTIAL_NOT_FOUND');
  }
  await prisma.webAuthnCredential.delete({ where: { id: credentialRowId } });
}

module.exports = {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  listCredentials,
  deleteCredential,
};
