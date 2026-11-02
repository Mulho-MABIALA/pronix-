// ─── Garde « mode maintenance » ───────────────────────────────────────────────
// Quand la maintenance est active, toute l'API répond 503 MAINTENANCE — sauf :
//  - les administrateurs connectés (pour vérifier le site et couper la maintenance)
//  - la connexion / session (pour qu'un admin puisse se connecter)
//  - les webhooks de paiement : un paiement validé pendant la maintenance doit
//    quand même activer l'abonnement, sinon le client paie pour rien
//  - l'état de santé et l'état de la maintenance
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/database');
const { ACCESS_COOKIE } = require('../config/cookies');
const { getMaintenance } = require('../services/maintenanceService');

const ALWAYS_ALLOWED = [
  /^\/api\/health$/,
  /^\/api\/maintenance$/,
  /^\/api\/payments\/[a-z]+\/webhook$/,
  /^\/api\/auth\/(login|logout|refresh-token|me|webauthn\/.*)$/,
];

// Rôle admin vérifié en base (et non sur la seule foi du jeton), gardé 30 s.
const adminCache = new Map();
async function isAdminRequest(req) {
  const token = req.cookies?.[ACCESS_COOKIE]
    || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (!token) return false;
  let payload;
  try { payload = jwt.verify(token, env.JWT_ACCESS_SECRET); } catch { return false; }
  const hit = adminCache.get(payload.sub);
  if (hit && hit.expiresAt > Date.now()) return hit.isAdmin;
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { role: true, isActive: true } });
  const isAdmin = !!user && user.isActive && user.role === 'ADMIN';
  adminCache.set(payload.sub, { isAdmin, expiresAt: Date.now() + 30000 });
  return isAdmin;
}

async function maintenanceGuard(req, res, next) {
  try {
    if (!req.path.startsWith('/api/')) return next();
    if (ALWAYS_ALLOWED.some((re) => re.test(req.path))) return next();
    const m = await getMaintenance();
    if (!m.enabled) return next();
    if (await isAdminRequest(req)) return next();
    res.set('Retry-After', '600');
    return res.status(503).json({
      success: false,
      code: 'MAINTENANCE',
      message: m.message || 'fpronix est en maintenance. Nous revenons très vite.',
      until: m.until,
    });
  } catch (err) {
    console.error('[Maintenance] garde:', err.message);
    return next(); // en cas de doute, on ne bloque pas
  }
}

module.exports = { maintenanceGuard };
