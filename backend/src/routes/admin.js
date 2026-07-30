const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getDashboard,
  getUsers, toggleUserStatus, deleteUser,
  getUserStats,
  sendEmailToUser,
  updateUserRole,
  cancelUserSubscription,
  updateAdminNote,
  getUserTips,
  getUserPayments,
  getUserReferrals,
  getReports, resolveReport,
  getAdminCompetitions, toggleCompetitionDisplay,
  getAdminTipsters,
  getAdminPayments,
  getAdminFinances,
  createExpense, deleteExpense,
  getAdminMatches,
  syncPredictions,
  triggerSync,
  exportUsers, exportPayments,
  getAdminTips, deleteAdminTip, toggleTipVisibility,
  getAdminComments, deleteAdminComment,
  activateUserSubscription,
  getAdminSupportTickets, replyToSupportTicket, updateTicketStatus,
} = require('../controllers/adminController');
const { adminBroadcast, getPushStats } = require('../controllers/pushController');
const {
  getAdminPartners, createPartner, updatePartner,
  getPartnerCommissions, markCommissionPaid, markAllCommissionsPaid,
} = require('../controllers/partnerController');

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', getDashboard);

// Utilisateurs
router.get('/users/stats',                         getUserStats);
router.get('/users',                               getUsers);
router.patch('/users/:userId/status',              toggleUserStatus);
router.delete('/users/:userId',                    deleteUser);
router.patch('/users/:userId/role',                updateUserRole);
router.patch('/users/:userId/note',                updateAdminNote);
router.post('/users/:userId/send-email',           sendEmailToUser);
router.delete('/users/:userId/subscription',       cancelUserSubscription);
router.post('/users/:userId/activate-subscription',activateUserSubscription);
router.get('/users/:userId/tips',                  getUserTips);
router.get('/users/:userId/payments',              getUserPayments);
router.get('/users/:userId/referrals',             getUserReferrals);

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

// Exports CSV
router.get('/export/users', exportUsers);
router.get('/export/payments', exportPayments);

// Pronostics (modération)
router.get('/tips', getAdminTips);
router.delete('/tips/:tipId', deleteAdminTip);
router.patch('/tips/:tipId/visibility', toggleTipVisibility);

// Commentaires (modération)
router.get('/comments', getAdminComments);
router.delete('/comments/:commentId', deleteAdminComment);

// Support tickets
router.get('/support/tickets', getAdminSupportTickets);
router.post('/support/tickets/:ticketId/reply', replyToSupportTicket);
router.patch('/support/tickets/:ticketId/status', updateTicketStatus);

// Programme Partenaires (influenceurs)
router.get('/partners', getAdminPartners);
router.post('/partners', createPartner);
router.patch('/partners/:id', updatePartner);
router.get('/partners/:id/commissions', getPartnerCommissions);
router.patch('/partners/commissions/:id/mark-paid', markCommissionPaid);
router.patch('/partners/:id/mark-all-paid', markAllCommissionsPaid);

module.exports = router;
