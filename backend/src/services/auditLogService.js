// ─── Journal d'audit admin ──────────────────────────────────────────────────
// Trace les actions admin sensibles (suspension/suppression de compte,
// activation manuelle d'abonnement, remboursement, modération...) pour
// pouvoir retracer un incident ou un litige a posteriori.
// Volontairement best-effort : un échec d'écriture du log ne doit jamais faire
// échouer l'action admin elle-même (même logique que notifyAdmin ailleurs).
const prisma = require('../config/database');

async function logAdminAction({ admin, action, targetType, targetId, details }) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId:    admin?.id || null,
        adminEmail: admin?.email || 'inconnu',
        action,
        targetType: targetType || null,
        targetId:   targetId || null,
        details:    details || null,
      },
    });
  } catch (err) {
    console.error('[AuditLog] échec d\'écriture (non bloquant):', err.message || err);
  }
}

module.exports = { logAdminAction };
