const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  subscribe,
  unsubscribe,
  getAdminSubscribers,
  exportSubscribers,
  importExistingUsers,
  broadcastEmail,
  deleteSubscriber,
} = require('../controllers/newsletterController');

const router = Router();

// Public
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);

// Admin
router.get('/admin/subscribers', authenticate, requireAdmin, getAdminSubscribers);
router.get('/admin/export', authenticate, requireAdmin, exportSubscribers);
router.post('/admin/import-users', authenticate, requireAdmin, importExistingUsers);
router.post('/admin/broadcast', authenticate, requireAdmin, broadcastEmail);
router.delete('/admin/subscribers/:id', authenticate, requireAdmin, deleteSubscriber);

module.exports = router;
