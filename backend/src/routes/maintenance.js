// État public du mode maintenance (lu par le site au chargement et toutes les
// minutes) + bascule réservée à l'admin.
const { Router } = require('express');
const { z } = require('zod');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getMaintenance, setMaintenance } = require('../services/maintenanceService');
const { logAdminAction } = require('../services/auditLogService');

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const m = await getMaintenance();
    res.json({ success: true, data: { enabled: m.enabled, message: m.message, until: m.until, startedAt: m.startedAt } });
  } catch (err) { next(err); }
});

router.patch('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { enabled, message, until } = z.object({
      enabled: z.boolean(),
      message: z.string().max(500).optional().nullable(),
      until: z.string().datetime({ offset: true }).optional().nullable(),
    }).parse(req.body);

    const value = await setMaintenance({ enabled, message, until }, req.user);
    logAdminAction({
      admin: req.user,
      action: enabled ? 'MAINTENANCE_ON' : 'MAINTENANCE_OFF',
      targetType: 'site',
      details: enabled ? { message: value.message, until: value.until } : null,
    });
    res.json({ success: true, data: value });
  } catch (err) { next(err); }
});

module.exports = router;
