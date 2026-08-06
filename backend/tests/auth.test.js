/**
 * Tests des flux d'authentification critiques
 * ─────────────────────────────────────────────────────────────────────────────
 * Couvre register / login / refresh-token / google / logout en isolant les
 * contrôleurs (pas de vraie connexion DB, pas de vrais emails, pas de vrai
 * appel Google) — objectif : détecter une régression sur l'auth avant prod,
 * pas de test end-to-end complet.
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));

jest.mock('../src/services/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendEmailVerification: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/services/adminNotificationService', () => ({
  notifyAdmin: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/config/database', () => ({
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  plan: { findUnique: jest.fn() },
  refreshToken: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
  webAuthnCredential: { count: jest.fn() },
  newsletterSubscriber: { upsert: jest.fn() },
  $transaction: jest.fn((ops) => Promise.all(ops)),
}));

const prisma = require('../src/config/database');
const bcrypt = require('bcryptjs');
const {
  register, login, refreshToken, logout, googleAuth,
} = require('../src/controllers/authController');
const { errorHandler } = require('../src/middleware/errorHandler');
const { REFRESH_COOKIE, ACCESS_COOKIE } = require('../src/config/cookies');

// ─── App de test minimale (routes montées directement sur les contrôleurs,
// sans le rate limiter d'authLimit — évite de trip le quota 10 req/15min
// alors qu'on envoie des dizaines de requêtes dans la suite) ─────────────────
function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.post('/api/auth/register', register);
  app.post('/api/auth/login', login);
  app.post('/api/auth/refresh-token', refreshToken);
  app.post('/api/auth/logout', logout);
  app.post('/api/auth/google', googleAuth);
  app.use(errorHandler);
  return app;
}

const FREE_PLAN = { id: 'plan-free', code: 'FREE' };

function baseUser(overrides = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    password: null,
    username: 'testuser',
    role: 'USER',
    isActive: true,
    googleId: null,
    profile: {},
    subscription: { plan: FREE_PLAN },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation((ops) => Promise.all(ops));
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  const app = buildApp();
  const validBody = {
    email: 'nouveau@example.com',
    password: 'Password1',
    username: 'nouveau_user',
    ageConfirmed: true,
  };

  it('crée le compte et pose les cookies de session (201)', async () => {
    prisma.plan.findUnique.mockResolvedValue(FREE_PLAN);
    prisma.user.create.mockResolvedValue(baseUser({ email: validBody.email, password: 'hashed' }));

    const res = await request(app).post('/api/auth/register').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie'].some((c) => c.startsWith(`${ACCESS_COOKIE}=`))).toBe(true);
    expect(res.headers['set-cookie'].some((c) => c.startsWith(`${REFRESH_COOKIE}=`))).toBe(true);

    // Régression : le compte doit s'ouvrir une session immédiatement, donc
    // lastLoginAt doit être posé dès la création (voir bug historique Google).
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
    }));
  });

  it('rejette un mot de passe trop faible (400 VALIDATION_ERROR)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validBody, password: 'weak' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejette si la case 18+ n\'est pas cochée (400 VALIDATION_ERROR)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validBody, ageConfirmed: false });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('renvoie 500 FREE_PLAN_MISSING si le plan gratuit est introuvable', async () => {
    prisma.plan.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/register').send(validBody);

    expect(res.status).toBe(500);
    expect(res.body.code).toBe('FREE_PLAN_MISSING');
  });

  it('renvoie 409 DUPLICATE_ENTRY si l\'email existe déjà', async () => {
    prisma.plan.findUnique.mockResolvedValue(FREE_PLAN);
    const p2002 = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
      meta: { target: ['email'] },
    });
    prisma.user.create.mockRejectedValue(p2002);

    const res = await request(app).post('/api/auth/register').send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_ENTRY');
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const app = buildApp();
  const credentials = { email: 'test@example.com', password: 'Password1' };

  it('renvoie 401 INVALID_CREDENTIALS si l\'utilisateur n\'existe pas', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login').send(credentials);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('renvoie 401 INVALID_CREDENTIALS si le compte est désactivé', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser({ isActive: false }));
    const res = await request(app).post('/api/auth/login').send(credentials);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('renvoie 401 GOOGLE_AUTH_REQUIRED si le compte n\'a pas de mot de passe (Google uniquement)', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser({ password: null }));
    const res = await request(app).post('/api/auth/login').send(credentials);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('GOOGLE_AUTH_REQUIRED');
  });

  it('renvoie 401 INVALID_CREDENTIALS si le mot de passe est incorrect', async () => {
    const hashed = await bcrypt.hash('AutreMotDePasse1', 4);
    prisma.user.findUnique.mockResolvedValue(baseUser({ password: hashed }));
    const res = await request(app).post('/api/auth/login').send(credentials);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('connecte l\'utilisateur et pose les cookies (200)', async () => {
    const hashed = await bcrypt.hash(credentials.password, 4);
    prisma.user.findUnique.mockResolvedValue(baseUser({ password: hashed }));
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});

    const res = await request(app).post('/api/auth/login').send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie'].some((c) => c.startsWith(`${ACCESS_COOKIE}=`))).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('exige une passkey pour un compte ADMIN qui en a déjà une (PASSKEY_REQUIRED, pas de session ouverte)', async () => {
    const hashed = await bcrypt.hash(credentials.password, 4);
    prisma.user.findUnique.mockResolvedValue(baseUser({ password: hashed, role: 'ADMIN' }));
    prisma.webAuthnCredential.count.mockResolvedValue(1);

    const res = await request(app).post('/api/auth/login').send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('PASSKEY_REQUIRED');
    expect(res.body.data.stepUpToken).toBeTruthy();
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

// ─── POST /api/auth/refresh-token ─────────────────────────────────────────

describe('POST /api/auth/refresh-token', () => {
  const app = buildApp();

  it('renvoie 401 INVALID_REFRESH_TOKEN si aucun cookie n\'est présent', async () => {
    const res = await request(app).post('/api/auth/refresh-token');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('renvoie 401 INVALID_REFRESH_TOKEN si le token est introuvable en base', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', [`${REFRESH_COOKIE}=unknown-token`]);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('renvoie 401 et efface les cookies si le token est expiré', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() - 1000),
      user: baseUser(),
    });
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', [`${REFRESH_COOKIE}=expired-token`]);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_REFRESH_TOKEN');
    expect(res.headers['set-cookie'].some((c) => c.startsWith(`${ACCESS_COOKIE}=;`))).toBe(true);
  });

  it('renouvelle la session (rotation du token + lastLoginAt) sur succès', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      user: baseUser(),
    });
    prisma.refreshToken.delete.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', [`${REFRESH_COOKIE}=valid-token`]);

    expect(res.status).toBe(200);
    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(res.headers['set-cookie'].some((c) => c.startsWith(`${ACCESS_COOKIE}=`))).toBe(true);
  });
});

// ─── POST /api/auth/google ─────────────────────────────────────────────────

describe('POST /api/auth/google', () => {
  const app = buildApp();

  it('renvoie 401 INVALID_GOOGLE_TOKEN si le token Google est invalide', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad token'));
    const res = await request(app).post('/api/auth/google').send({ credential: 'bad' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_GOOGLE_TOKEN');
  });

  it('renvoie 400 GOOGLE_NO_EMAIL si Google ne renvoie pas d\'email', async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: 'g-1' }) });
    const res = await request(app).post('/api/auth/google').send({ credential: 'tok' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('GOOGLE_NO_EMAIL');
  });

  it('renvoie 403 ACCOUNT_DISABLED pour un compte existant désactivé', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'test@example.com', sub: 'g-1', name: 'Test' }),
    });
    prisma.user.findUnique.mockResolvedValue(baseUser({ isActive: false }));
    const res = await request(app).post('/api/auth/google').send({ credential: 'tok' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_DISABLED');
  });

  it('connecte un compte existant, lie le googleId et met à jour lastLoginAt (régression bug historique)', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'test@example.com', sub: 'g-1', name: 'Test' }),
    });
    prisma.user.findUnique.mockResolvedValue(baseUser({ googleId: null }));
    prisma.user.update.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({});

    const res = await request(app).post('/api/auth/google').send({ credential: 'tok' });

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({ lastLoginAt: expect.any(Date), googleId: 'g-1' }),
    });
    expect(res.headers['set-cookie'].some((c) => c.startsWith(`${ACCESS_COOKIE}=`))).toBe(true);
  });

  it('refuse la création d\'un nouveau compte sans confirmation 18+ (400 AGE_CONFIRMATION_REQUIRED)', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'new@example.com', sub: 'g-2', name: 'New' }),
    });
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/google').send({ credential: 'tok', ageConfirmed: false });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('AGE_CONFIRMATION_REQUIRED');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('crée un nouveau compte avec lastLoginAt posé dès la création (200)', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'new@example.com', sub: 'g-2', name: 'New', picture: 'http://x/pic.png' }),
    });
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // recherche par email : pas de compte
      .mockResolvedValueOnce(null); // generateUniqueUsername : pseudo dispo
    prisma.plan.findUnique.mockResolvedValue(FREE_PLAN);
    prisma.user.create.mockResolvedValue(baseUser({ id: 'user-2', email: 'new@example.com', googleId: 'g-2' }));
    prisma.refreshToken.create.mockResolvedValue({});

    const res = await request(app).post('/api/auth/google').send({ credential: 'tok', ageConfirmed: true });

    expect(res.status).toBe(200);
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ lastLoginAt: expect.any(Date), googleId: 'g-2' }),
    }));
  });
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  const app = buildApp();

  it('efface les cookies et supprime le refresh token en base (200)', async () => {
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`${REFRESH_COOKIE}=some-token`]);

    expect(res.status).toBe(200);
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { token: 'some-token' } });
    expect(res.headers['set-cookie'].some((c) => c.startsWith(`${ACCESS_COOKIE}=;`))).toBe(true);
  });

  it('renvoie 200 même sans cookie de session', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
  });
});
