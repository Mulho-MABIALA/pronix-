const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getDashboard,
  getUsers, toggleUserStatus,
  getReports, resolveReport,
  getAdminCompetitions, toggleCompetitionDisplay,
  getAdminTipsters,
  getAdminPayments,
  getAdminFinances,
  createExpense, deleteExpense,
  getAdminMatches,
  syncPredictions,
  triggerSync,
} = require('../controllers/adminController');
const { adminBroadcast, getPushStats } = require('../controllers/pushController');

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
router.get('/finances', getAdminFinances);
router.post('/expenses', createExpense);
router.delete('/expenses/:id', deleteExpense);
router.get('/matches', getAdminMatches);

router.post('/sync', triggerSync);
router.post('/sync-predictions', syncPredictions);
router.get('/push/stats', getPushStats);
router.post('/push/broadcast', adminBroadcast);

module.exports = router;
