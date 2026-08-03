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
// L'app tourne sur une seule instance PM2 sans session middleware/Redis : le
// challenge de LOGIN (utilisateur anonyme) est donc gardé en mémoire ici,
// avec une expiration courte. Le challenge de REGISTRATION (utilisateur
// authentifié) est lui stocké sur User.currentChallenge, comme pour les flows
// email existants (vérification, reset mot de passe).
const crypto = require('crypto');
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
const loginChallenges = new Map(); // challengeId -> { challenge, expiresAt }
const LOGIN_CHALLENGE_TTL_MS = 2 * 60 * 1000;

function pruneExpiredLoginChallenges() {
  const now = Date.now();
  for (const [id, entry] of loginChallenges) {
    if (entry.expiresAt < now) loginChallenges.delete(id);
  }
}

function storeLoginChallenge(challenge) {
  pruneExpiredLoginChallenges();
  const challengeId = crypto.randomBytes(24).toString('hex');
  loginChallenges.set(challengeId, { challenge, expiresAt: Date.now() + LOGIN_CHALLENGE_TTL_MS });
  return challengeId;
}

function consumeLoginChallenge(challengeId) {
  const entry = loginChallenges.get(challengeId);
  if (!entry) return null;
  loginChallenges.delete(challengeId); // usage unique
  if (entry.expiresAt < Date.now()) return null;
  return entry.challenge;
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
async function getAuthenticationOptions() {
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    // allowCredentials volontairement omis : le navigateur propose toutes les
    // passkeys "discoverable" enregistrées pour ce domaine (login usernameless)
  });

  const challengeId = storeLoginChallenge(options.challenge);
  return { options, challengeId };
}

async function verifyAuthentication(challengeId, response) {
  const expectedChallenge = consumeLoginChallenge(challengeId);
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
