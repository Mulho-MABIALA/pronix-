const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getDashboard,
  getUsers, toggleUserStatus,
  getReports, resolveReport,
  getAdminCompetitions, toggleCompetitionDisplay,
  getAdminTipsters,
  getAdminPayments,
  getAdminMatches,
  syncPredictions,
  triggerSync,
} = require('../controllers/adminController');
const { adminBroadcast } = require('../controllers/pushController');

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', getDashboard);

router.get('/users', getUsers);
router.patch('/users/:userId/status', toggleUserStatus);

router.get('/reports', getReports);
router.patch('/reports/:reportId/resolve', resolveReport);

router.get('/competitions', getAdminCompetitions);
router.patch('/competitions/:competitionId/display', toggleCompetitionDisplay);

router.get('/tipsters', getAdminTipsters);
router.get('/payments', getAdminPayments);
router.get('/matches', getAdminMatches);

router.post('/sync', triggerSync);
router.post('/sync-predictions', syncPredictions);
router.post('/push/broadcast', adminBroadcast);

module.exports = router;
